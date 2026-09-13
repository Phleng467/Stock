import { google } from 'googleapis';
import { readDB, writeDB, DBState } from './db';

export async function syncWithGoogleSheets(token: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  let db = readDB();
  let spreadsheetId = db.settings.spreadsheetId;

  if (!spreadsheetId) {
    // Create new spreadsheet
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: 'Inventory Sync - AI Studio App' },
      }
    });
    spreadsheetId = response.data.spreadsheetId;
    db.settings.spreadsheetId = spreadsheetId;
    writeDB(db);
  }

  // 1. Fetch current sheets to know what exists
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

  // Group products by brand
  const brandGroups: Record<string, any[]> = {};
  db.brands.forEach(b => brandGroups[b.name] = []);
  
  db.products.forEach(p => {
    const brand = db.brands.find(b => b.id === p.brandId);
    if (brand) brandGroups[brand.name].push(p);
  });

  // Prepare batch update to create missing sheets and write data
  const requests: any[] = [];
  
  // We'll write to sheets: Website -> Sheets
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

  // Write data to sheets
  for (const brandName of Object.keys(brandGroups)) {
    const rows = [['Model', 'Category', 'RAM', 'ROM', 'Color', 'SKU', 'Retail Price', 'Wholesale Price', 'Stock']];
    const products = brandGroups[brandName];
    
    products.forEach(p => {
      p.variants.forEach(v => {
        v.colors.forEach(c => {
          rows.push([
            p.model, p.category, v.ram, v.rom, c.colorName, c.sku, 
            v.retailPrice, v.wholesalePrice || '', c.stock
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
}
