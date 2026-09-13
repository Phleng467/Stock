import { google } from 'googleapis';
import { readDB, writeDB, DBState } from './db';
import { v4 as uuidv4 } from 'uuid';

export async function pushToGoogleSheets(token: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  const sheets = google.sheets({ version: 'v4', auth });

  let db = readDB();
  let spreadsheetId = db.settings.spreadsheetId;

  if (spreadsheetId) {
    try {
      await sheets.spreadsheets.get({ spreadsheetId });
    } catch (error: any) {
      const status = error.code || error.status || (error.response && error.response.status);
      if (status === 403 || status === 404) {
        // Spreadsheet inaccessible, clear it
        console.warn('Existing spreadsheet inaccessible, creating a new one.');
        spreadsheetId = null;
      } else {
        throw error;
      }
    }
  }

  if (!spreadsheetId) {
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: 'Inventory Sync - AI Studio App' },
      }
    });
    spreadsheetId = response.data.spreadsheetId;
    db.settings.spreadsheetId = spreadsheetId;
    writeDB(db);
  }

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

  const brandGroups: Record<string, any[]> = {};
  db.brands.forEach(b => brandGroups[b.name] = []);
  
  db.products.forEach(p => {
    const brand = db.brands.find(b => b.id === p.brandId);
    if (brand) brandGroups[brand.name].push(p);
  });

  const requests: any[] = [];
  
  for (const brandName of Object.keys(brandGroups)) {
    if (!existingSheets.includes(brandName)) {
      requests.push({
        addSheet: { properties: { title: brandName } }
      });
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    });
  }

  for (const brandName of Object.keys(brandGroups)) {
    const rows = [['Model', 'Category', 'RAM', 'ROM', 'Color', 'SKU', 'Retail Price', 'Wholesale Price', 'Stock']];
    const products = brandGroups[brandName];
    
    products.forEach(p => {
      (p.variants || []).forEach((v: any) => {
        (v.colors || []).forEach((c: any) => {
          rows.push([
            p.model, p.category, v.ram || '', v.rom || '', c.colorName, c.sku || '', 
            v.retailPrice || 0, v.wholesalePrice || 0, c.stock || 0
          ]);
        });
      });
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${brandName}!A1:I`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows }
    });
  }

  return spreadsheetId;
}

export async function pullFromGoogleSheets(token: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  const sheets = google.sheets({ version: 'v4', auth });

  let db = readDB();
  const spreadsheetId = db.settings.spreadsheetId;

  if (!spreadsheetId) {
    throw new Error('No spreadsheet linked. Push to sheets first.');
  }

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetNames = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

  const newProducts: any[] = [];
  
  for (const sheetName of sheetNames) {
    let brand = db.brands.find(b => b.name === sheetName);
    if (!brand) {
      brand = { id: uuidv4(), name: sheetName, order: db.brands.length + 1, isHidden: false };
      db.brands.push(brand);
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:I`
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) continue;

    const productsByModel: Record<string, any> = {};

    rows.forEach(row => {
      const [model, category, ram, rom, colorName, sku, retailPrice, wholesalePrice, stock] = row;
      if (!model) return;

      if (!productsByModel[model]) {
        productsByModel[model] = {
          id: uuidv4(),
          brandId: brand.id,
          model,
          category: category === 'Tablet' ? 'Tablet' : 'Mobile',
          detail: '',
          specs: {},
          isHidden: false,
          variants: []
        };
      }

      const product = productsByModel[model];
      
      if (!product.variants) product.variants = [];
      let variant = product.variants.find((v: any) => v.ram === ram && v.rom === rom);
      if (!variant) {
        variant = {
          id: uuidv4(),
          ram: ram || '',
          rom: rom || '',
          retailPrice: Number(retailPrice) || 0,
          wholesalePrice: Number(wholesalePrice) || 0,
          colors: []
        };
        product.variants.push(variant);
      }

      if (!variant.colors) variant.colors = [];
      let color = variant.colors.find((c: any) => c.colorName === colorName);
      if (!color) {
        variant.colors.push({
          id: uuidv4(),
          colorName: colorName || 'Default',
          sku: sku || '',
          stock: Number(stock) || 0
        });
      } else {
        color.stock = Number(stock) || 0;
        color.sku = sku || color.sku;
      }
    });

    newProducts.push(...Object.values(productsByModel));
  }

  // Update existing products or add new ones
  newProducts.forEach(newP => {
    const existingIdx = db.products.findIndex((p: any) => p.model === newP.model && p.brandId === newP.brandId);
    if (existingIdx >= 0) {
      const existingP = db.products[existingIdx];
      if (!existingP.variants) existingP.variants = [];
      // Sync variants
      (newP.variants || []).forEach((newV: any) => {
        let existingV = existingP.variants.find((ev: any) => ev.ram === newV.ram && ev.rom === newV.rom);
        if (!existingV) {
          existingP.variants.push(newV);
        } else {
          existingV.retailPrice = newV.retailPrice;
          existingV.wholesalePrice = newV.wholesalePrice;
          if (!existingV.colors) existingV.colors = [];
          (newV.colors || []).forEach((newC: any) => {
            let existingC = existingV.colors.find((ec: any) => ec.colorName === newC.colorName);
            if (!existingC) {
              existingV.colors.push(newC);
            } else {
              existingC.stock = newC.stock;
              existingC.sku = newC.sku;
            }
          });
        }
      });
    } else {
      db.products.push(newP);
    }
  });

  writeDB(db);
  return { success: true, message: 'Pulled data successfully' };
}
