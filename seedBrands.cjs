const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'data.json');
let data = { products: [], brands: [], settings: {} };
if (fs.existsSync(dbPath)) {
  data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

const marketBrands = [
  "Apple", "Samsung", "OPPO", "vivo", "Xiaomi", 
  "realme", "HONOR", "Infinix", "TECNO", "OnePlus", 
  "Motorola", "Nothing", "HUAWEI", "Asus", "ROG", "POCO", "iQOO", "ZTE", "TCL", "Itel", "Benco", "Redmi"
];

let order = data.brands.length + 1;

marketBrands.forEach(brandName => {
  if (!data.brands.find(b => b.name.toLowerCase() === brandName.toLowerCase())) {
    data.brands.push({
      id: uuidv4(),
      name: brandName,
      order: order++,
      isHidden: false
    });
  }
});

fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
console.log("Brands seeded.");
