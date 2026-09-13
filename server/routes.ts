import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { readDB, writeDB } from './db';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';
import { syncWithGoogleSheets } from './sheets';
import multer from 'multer';

export const apiRouter = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `prod_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB
});

// Image Upload Endpoint (supports multipart file or base64 dataUrl)
apiRouter.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (req.file) {
      return res.json({ url: `/uploads/${req.file.filename}` });
    }
    if (req.body && req.body.dataUrl) {
      const dataUrl = req.body.dataUrl as string;
      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1].includes('jpeg') || matches[1].includes('jpg') ? '.jpg' : matches[1].includes('webp') ? '.webp' : '.png';
        const filename = `capture_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
        const buffer = Buffer.from(matches[2], 'base64');
        fs.writeFileSync(path.join(uploadsDir, filename), buffer);
        return res.json({ url: `/uploads/${filename}` });
      }
    }
    return res.status(400).json({ error: 'ไม่พบไฟล์รูปภาพ' });
  } catch (err) {
    console.error('Upload handling error:', err);
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ' });
  }
});

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
apiRouter.post('/products/bulk', (req, res) => {
  const db = readDB();
  const products = req.body;
  
  if (!Array.isArray(products)) {
    return res.status(400).json({ error: 'Expected an array of products' });
  }
  
  const newProducts = products.map(p => ({
    id: uuidv4(),
    ...p
  }));
  
  db.products.push(...newProducts);
  writeDB(db);
  res.json({ success: true, count: newProducts.length });
});

apiRouter.post('/ai/image/generate', async (req, res) => {
  try {
    const { prompt, aspectRatio = '16:9' } = req.body;
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: { aspectRatio, imageSize: "1K" }
      }
    });

    let base64Url = null;
    if (response.candidates && response.candidates.length > 0) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Url = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }
    
    if (base64Url) {
      // Save it locally
      const buffer = Buffer.from(base64Url.split(',')[1], 'base64');
      const filename = `gen_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      return res.json({ url: `/uploads/${filename}` });
    }

    res.status(500).json({ error: 'Failed to generate image' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Image generation failed' });
  }
});

apiRouter.post('/ai/image/edit', async (req, res) => {
  try {
    const { prompt, dataUrl } = req.body;
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches) throw new Error('Invalid base64 image');

    const mimeType = matches[1];
    const data = matches[2];

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: {
        parts: [
          { inlineData: { data, mimeType } },
          { text: prompt || "Remove the background of this image and keep only the product" }
        ]
      },
      config: {
        imageConfig: { aspectRatio: '1:1', imageSize: "1K" }
      }
    });

    let base64Url = null;
    if (response.candidates && response.candidates.length > 0) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Url = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }
    
    if (base64Url) {
      const buffer = Buffer.from(base64Url.split(',')[1], 'base64');
      const filename = `edited_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      return res.json({ url: `/uploads/${filename}` });
    }

    res.status(500).json({ error: 'Failed to edit image' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Image editing failed' });
  }
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

// Promotions routes
apiRouter.get('/promotions', (req, res) => {
  const db = readDB();
  const dbPromos = db.promotions || [];
  
  // Return just the array of image URLs to maintain compatibility with storefront
  // But also include full objects for admin
  res.json({
    images: dbPromos.map(p => p.url),
    promotions: dbPromos
  });
});

apiRouter.post('/promotions', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  
  const db = readDB();
  if (!db.promotions) db.promotions = [];
  
  const newPromo = { id: uuidv4(), url };
  db.promotions.push(newPromo);
  writeDB(db);
  
  res.json(newPromo);
});

apiRouter.delete('/promotions/:id', (req, res) => {
  const db = readDB();
  if (!db.promotions) db.promotions = [];
  
  const initialLen = db.promotions.length;
  db.promotions = db.promotions.filter(p => p.id !== req.params.id);
  
  if (db.promotions.length < initialLen) {
    writeDB(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Promotion not found' });
  }
});

// Chatbot route
apiRouter.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const db = readDB();
    const productInfo = db.products.map(p => {
      const brand = db.brands.find(b => b.id === p.brandId);
      return `${brand?.name || 'Unknown'} ${p.model}: ${p.variants.map(v => `${v.ram}/${v.rom} - ฿${v.retailPrice}`).join(', ')}`;
    }).join('\n');

    const systemInstruction = `คุณคือผู้ช่วย AI ของร้าน เจมาร์ท (Jaymart) สาขาโรบินสันสุรินทร์ ชั้น 2 ตอบคำถามลูกค้าด้วยความสุภาพ น่ารัก เป็นกันเอง
มีข้อมูลสินค้าปัจจุบันดังนี้ (ราคาและสเปค):
${productInfo}

ให้ตอบคำถามเกี่ยวกับมือถือและแท็บเล็ตในร้าน แนะนำสินค้าตามงบ หรือบอกข้อมูลราคา หากไม่ทราบให้บอกว่า "สามารถเข้ามาสอบถามได้ที่หน้าร้านเจมาร์ท สาขาโรบินสันสุรินทร์ ชั้น 2 ได้เลยค่ะ"`;

    // Format history for Gemini API
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // Generate response using history context
    const contents = [
      ...formattedHistory,
      { role: 'user', parts: [{ text: message }] }
    ];

    // Add a simple retry logic for 503 High Demand errors
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contents,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });
    } catch (err: any) {
      if (err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('high demand')) {
        console.warn('Gemini API 503 High Demand Error. Returning fallback message.');
        return res.json({ 
          reply: 'ขออภัยด้วยนะคะ ตอนนี้ระบบผู้ช่วย AI กำลังมีผู้ใช้งานเยอะมาก อาจจะตอบกลับล่าช้าไปบ้าง สามารถเข้ามาสอบถามโดยตรงได้ที่หน้าร้านเจมาร์ท สาขาโรบินสันสุรินทร์ ชั้น 2 ได้เลยค่ะ' 
        });
      }
      throw err;
    }

    res.json({ reply: response.text });
  } catch (err: any) {
    console.error('Chat API Error:', err);
    res.status(500).json({ error: 'Failed to communicate with AI', details: err.message });
  }
});
