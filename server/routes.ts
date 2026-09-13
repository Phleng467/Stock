import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { readDB, writeDB } from './db';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';
import { syncWithGoogleSheets } from './sheets';
import multer from 'multer';

export const apiRouter = Router();

apiRouter.post('/auth/login', (req, res) => {
  const { password } = req.body;
  if (password === 'aaa1480') {
    res.json({ token: 'master-token', role: 'master' });
  } else {
    res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
  }
});

apiRouter.get('/brands', (req, res) => {
  res.json(readDB().brands.sort((a, b) => a.order - b.order));
});
apiRouter.post('/brands', (req, res) => {
  const db = readDB();
  const newBrand = { id: uuidv4(), ...req.body };
  db.brands.push(newBrand);
  writeDB(db);
  res.json(newBrand);
});
apiRouter.put('/brands/:id', (req, res) => {
  const db = readDB();
  const index = db.brands.findIndex(b => b.id === req.params.id);
  if (index !== -1) {
    db.brands[index] = { ...db.brands[index], ...req.body };
    writeDB(db);
    res.json(db.brands[index]);
  } else {
    res.status(404).send('Not found');
  }
});

apiRouter.get('/products', (req, res) => {
  res.json(readDB().products);
});
apiRouter.post('/products', (req, res) => {
  const db = readDB();
  const newProduct = { id: uuidv4(), ...req.body };
  db.products.push(newProduct);
  writeDB(db);
  res.json(newProduct);
});
apiRouter.put('/products/:id', (req, res) => {
  const db = readDB();
  const index = db.products.findIndex(p => p.id === req.params.id);
  if (index !== -1) {
    db.products[index] = { ...db.products[index], ...req.body };
    writeDB(db);
    res.json(db.products[index]);
  } else {
    res.status(404).send('Not found');
  }
});

apiRouter.post('/products/fetch-specs', async (req, res) => {
  const { model, category } = req.body;
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    const prompt = `Return a strict JSON object (no markdown formatting, just the raw JSON braces) containing specifications and official color names for the ${category === 'Tablet' ? 'tablet' : 'mobile phone'}: "${model}". 
Keys must include: 
- "screen": display specs (e.g. "6.1-inch Super Retina XDR OLED")
- "chipset": processor specs (e.g. "A16 Bionic")
- "camera": camera specs (e.g. "48MP Dual Camera")
- "battery": battery specs (e.g. "3349 mAh")
- "os": operating system (e.g. "iOS 17")
- "weight": weight in grams (e.g. "171g")
- "colors": array of 3 to 6 official color names for this model in English or Thai (e.g. ["Black", "Blue", "Green", "Yellow", "Pink"])
Example: {"screen": "6.1-inch OLED", "chipset": "A16 Bionic", "camera": "48MP Main", "battery": "3349 mAh", "os": "iOS 17", "weight": "171g", "colors": ["Black", "Blue", "Green", "Yellow", "Pink"]}`;
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
    } catch (modelErr) {
      console.warn('Falling back to gemini-3.6-flash', modelErr);
      response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
    }
    let text = response.text || "{}";
    if (text.startsWith('\`\`\`json')) {
      text = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    }
    res.json(JSON.parse(text));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch specs' });
  }
});

// Search real product images from web (Bing, Wikimedia Commons, with resilient fallback)
apiRouter.post('/products/search-images', async (req, res) => {
  const { query, brand, model, color } = req.body;
  let searchQuery = (query || '').trim();
  if (!searchQuery) {
    const parts = [brand, model, color].filter(Boolean);
    searchQuery = parts.join(' ') + ' official phone';
  }

  const results: { title: string; imageUrl: string; thumbnailUrl: string; source?: string; width?: number; height?: number }[] = [];
  const seenUrls = new Set<string>();

  const addResult = (item: { title: string; imageUrl: string; thumbnailUrl: string; source?: string; width?: number; height?: number }) => {
    if (!item.imageUrl || seenUrls.has(item.imageUrl)) return;
    seenUrls.add(item.imageUrl);
    results.push(item);
  };

  // 1. Try Bing Images HTML search (fast, high-resolution original images)
  try {
    const url = 'https://www.bing.com/images/search?q=' + encodeURIComponent(searchQuery) + '&form=HDRSC2&first=1';
    const bingRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (bingRes.ok) {
      const html = await bingRes.text();
      const regex = /m="(\{[^"]+?\})"/g;
      let match;
      while ((match = regex.exec(html)) !== null) {
        try {
          const decoded = match[1].replace(/&quot;/g, '"');
          const item = JSON.parse(decoded);
          if (item.murl && typeof item.murl === 'string' && item.murl.startsWith('http')) {
            addResult({
              title: (item.t || item.desc || searchQuery).replace(/[\uE000-\uF8FF]/g, '').trim(),
              imageUrl: item.murl,
              thumbnailUrl: (item.turl || item.murl).replace(/&amp;/g, '&'),
              source: item.purl ? new URL(item.purl).hostname.replace(/^www\./, '') : 'Bing Images',
              width: item.mdwidth,
              height: item.mdheight
            });
          }
        } catch {
          // ignore single item json parse issues
        }
        if (results.length >= 28) break;
      }
    }
  } catch (bingErr) {
    console.warn('Bing image search warning:', bingErr);
  }

  // 2. Wikimedia Commons API (official renders, transparent PNG/SVG, never blocked)
  if (results.length < 12) {
    try {
      const wikiUrl = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=' + 
        encodeURIComponent(searchQuery) + '&gsrnamespace=6&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=800&format=json';
      const wikiRes = await fetch(wikiUrl, {
        headers: { 'User-Agent': 'MobileStoreImageSearch/1.0' }
      });
      if (wikiRes.ok) {
        const text = await wikiRes.text();
        if (text.startsWith('{')) {
          const wikiData = JSON.parse(text);
          const pages = Object.values(wikiData.query?.pages || {}) as any[];
          for (const p of pages) {
            const info = p.imageinfo?.[0];
            if (info && (info.url?.match(/\.(jpg|jpeg|png|webp|svg)$/i) || info.thumburl)) {
              addResult({
                title: p.title.replace(/^File:/, '').replace(/\.[^/.]+$/, ''),
                imageUrl: info.url,
                thumbnailUrl: info.thumburl || info.url,
                source: 'Wikimedia Commons',
                width: info.width,
                height: info.height
              });
            }
            if (results.length >= 30) break;
          }
        }
      }
    } catch (wikiErr) {
      console.warn('Wikimedia image search warning:', wikiErr);
    }
  }

  // Return results safely (never 500)
  res.json({ results, query: searchQuery });
});

apiRouter.post('/sync/sheets', async (req, res) => {
  const { token } = req.body;
  try {
    const db = readDB();
    db.settings.syncStatus = 'syncing';
    writeDB(db);
    
    await syncWithGoogleSheets(token);
    
    const newDb = readDB();
    newDb.settings.syncStatus = 'success';
    writeDB(newDb);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    const db = readDB();
    db.settings.syncStatus = 'error';
    writeDB(db);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Promotions route
apiRouter.get('/promotions', (req, res) => {
  try {
    const promoDir = path.join(process.cwd(), 'public', 'promotions');
    let localImages: string[] = [];
    if (fs.existsSync(promoDir)) {
      localImages = fs.readdirSync(promoDir)
        .filter((f: string) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
        .sort()
        .map((f: string) => '/promotions/' + f);
    }
    
    // Always ensure at least one image if available
    if (localImages.length === 0) {
      localImages = [
        'https://lh3.googleusercontent.com/d/1Z6fzVIUoBnHFNez6D0HBDhEf_QXLyKgf',
        'https://lh3.googleusercontent.com/d/1znNOJ8wCYGpoZJJo3ub_Q_C30MQ1Zmx8'
      ];
    }

    res.json({
      folderUrl: 'https://drive.google.com/drive/folders/1XgkBQ2BwvQHqFBs5aXHDlKvLqiXhl4U3',
      images: localImages,
      driveImages: [
        'https://lh3.googleusercontent.com/d/1Z6fzVIUoBnHFNez6D0HBDhEf_QXLyKgf',
        'https://lh3.googleusercontent.com/d/1znNOJ8wCYGpoZJJo3ub_Q_C30MQ1Zmx8'
      ]
    });
  } catch (err) {
    res.json({
      folderUrl: 'https://drive.google.com/drive/folders/1XgkBQ2BwvQHqFBs5aXHDlKvLqiXhl4U3',
      images: [
        'https://lh3.googleusercontent.com/d/1Z6fzVIUoBnHFNez6D0HBDhEf_QXLyKgf',
        'https://lh3.googleusercontent.com/d/1znNOJ8wCYGpoZJJo3ub_Q_C30MQ1Zmx8'
      ]
    });
  }
});
