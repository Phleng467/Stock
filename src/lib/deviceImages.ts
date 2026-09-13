// Device image library and color mapping for smart auto-image selection

export interface ImageOption {
  url: string;
  label: string;
  colorName?: string;
}

// Map Thai and English color names to accurate hex codes
export function getColorHex(colorName: string): string {
  if (!colorName) return '#94a3b8';
  const name = colorName.trim().toLowerCase();

  // Thai mappings
  if (name.includes('ดำ') || name.includes('black') || name.includes('dark') || name.includes('midnight') || name.includes('มิดไนท์')) {
    return '#1c1c1e';
  }
  if (name.includes('ขาว') || name.includes('white') || name.includes('starlight') || name.includes('สตาร์ไลท์')) {
    return '#f5f5f7';
  }
  if (name.includes('ไทเทเนียมธรรมชาติ') || name.includes('natural') || name.includes('ไทเทเนียม')) {
    return '#9a968f';
  }
  if (name.includes('ไทเทเนียมดำ') || name.includes('black titanium')) {
    return '#2b2b2d';
  }
  if (name.includes('ไทเทเนียมขาว') || name.includes('white titanium')) {
    return '#e3e4e6';
  }
  if (name.includes('ไทเทเนียมน้ำเงิน') || name.includes('blue titanium')) {
    return '#3d4754';
  }
  if (name.includes('ไทเทเนียมทะเลทราย') || name.includes('desert titanium') || name.includes('desert')) {
    return '#cbb29b';
  }
  if (name.includes('ทอง') || name.includes('gold')) {
    return '#fae7cf';
  }
  if (name.includes('เงิน') || name.includes('silver')) {
    return '#e2e4e6';
  }
  if (name.includes('น้ำเงิน') || name.includes('ฟ้า') || name.includes('blue') || name.includes('sky') || name.includes('cyan')) {
    return '#3b82f6';
  }
  if (name.includes('เขียว') || name.includes('green') || name.includes('mint') || name.includes('emerald')) {
    return '#10b981';
  }
  if (name.includes('ม่วง') || name.includes('purple') || name.includes('violet') || name.includes('lavender')) {
    return '#a855f7';
  }
  if (name.includes('ชมพู') || name.includes('pink') || name.includes('rose')) {
    return '#ec4899';
  }
  if (name.includes('แดง') || name.includes('red')) {
    return '#ef4444';
  }
  if (name.includes('ส้ม') || name.includes('orange')) {
    return '#f97316';
  }
  if (name.includes('เหลือง') || name.includes('yellow')) {
    return '#eab308';
  }
  if (name.includes('เทา') || name.includes('gray') || name.includes('grey') || name.includes('graphite') || name.includes('space')) {
    return '#64748b';
  }

  return '#94a3b8';
}

// Curated high quality transparent/clean device renders
const CURATED_DEVICE_DATABASE: Record<string, Record<string, string>> = {
  // iPhone 15
  'iphone 15': {
    'black': 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80',
    'blue': 'https://images.unsplash.com/photo-1695048133148-f8605ee71569?w=600&auto=format&fit=crop&q=80',
    'green': 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80',
    'yellow': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
    'pink': 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    'default': 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80'
  },
  // iPhone 15 Pro / Pro Max
  'iphone 15 pro': {
    'natural': 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80',
    'blue': 'https://images.unsplash.com/photo-1695048133148-f8605ee71569?w=600&auto=format&fit=crop&q=80',
    'white': 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80',
    'black': 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80',
    'default': 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80'
  },
  // iPhone 16
  'iphone 16': {
    'black': 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80',
    'white': 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80',
    'pink': 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    'teal': 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80',
    'ultramarine': 'https://images.unsplash.com/photo-1695048133148-f8605ee71569?w=600&auto=format&fit=crop&q=80',
    'default': 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80'
  },
  // Samsung Galaxy S24
  'galaxy s24': {
    'black': 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80',
    'gray': 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80',
    'violet': 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    'yellow': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
    'default': 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80'
  },
  // Samsung Galaxy A55 / A35
  'galaxy a55': {
    'iceblue': 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    'navy': 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80',
    'lilac': 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
    'default': 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80'
  },
  // iPad
  'ipad': {
    'silver': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80',
    'space gray': 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600&auto=format&fit=crop&q=80',
    'blue': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80',
    'pink': 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=600&auto=format&fit=crop&q=80',
    'default': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80'
  }
};

// Generates an ultra clean SVG mockup for any smartphone/tablet in the exact specified color
export function generateDeviceSvg(modelName: string, colorName: string, category: 'Mobile' | 'Tablet' = 'Mobile'): string {
  const hex = getColorHex(colorName);
  const isTablet = category === 'Tablet' || modelName.toLowerCase().includes('ipad') || modelName.toLowerCase().includes('tab');
  
  const width = isTablet ? 380 : 280;
  const height = isTablet ? 500 : 540;
  const rx = isTablet ? 32 : 44;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
      <defs>
        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${hex}" />
          <stop offset="100%" stop-color="${hex}" stop-opacity="0.85" />
        </linearGradient>
        <linearGradient id="metalRim" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4" />
          <stop offset="50%" stop-color="#000000" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.2" />
        </linearGradient>
        <filter id="phoneShadow" x="-10%" y="-10%" width="125%" height="125%">
          <feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#000000" flood-opacity="0.18" />
        </filter>
      </defs>
      
      <!-- Phone Body -->
      <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="${rx}" fill="url(#bodyGrad)" stroke="#ffffff" stroke-width="2" stroke-opacity="0.3" filter="url(#phoneShadow)" />
      <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="${rx}" fill="none" stroke="url(#metalRim)" stroke-width="4" />
      
      <!-- Camera Island / Module -->
      ${isTablet ? `
        <rect x="42" y="42" width="44" height="44" rx="14" fill="#0f172a" fill-opacity="0.25" />
        <circle cx="64" cy="64" r="14" fill="#1e293b" />
        <circle cx="64" cy="64" r="7" fill="#0284c7" fill-opacity="0.6" />
      ` : `
        <rect x="36" y="36" width="76" height="88" rx="22" fill="#0f172a" fill-opacity="0.22" />
        <circle cx="60" cy="58" r="18" fill="#1e293b" stroke="#334155" stroke-width="2" />
        <circle cx="60" cy="58" r="9" fill="#0284c7" fill-opacity="0.6" />
        <circle cx="60" cy="100" r="18" fill="#1e293b" stroke="#334155" stroke-width="2" />
        <circle cx="60" cy="100" r="9" fill="#0284c7" fill-opacity="0.6" />
        <circle cx="94" cy="80" r="7" fill="#fef08a" fill-opacity="0.8" />
      `}
      
      <!-- Brand Center Subtle Glow / Logo area -->
      <circle cx="${width / 2}" cy="${height / 2}" r="18" fill="#ffffff" fill-opacity="0.15" />
      
      <!-- Label -->
      <text x="${width / 2}" y="${height - 54}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Prompt', sans-serif" font-size="13" font-weight="600" fill="#ffffff" fill-opacity="0.85" letter-spacing="1">
        ${colorName || modelName}
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Get suggested image options for a model & color
export function getSuggestedImages(brandName: string, modelName: string, colorName: string = ''): ImageOption[] {
  const options: ImageOption[] = [];
  const cleanModel = modelName.trim().toLowerCase();
  const cleanColor = colorName.trim().toLowerCase();

  // Look up curated matches
  for (const [key, colorMap] of Object.entries(CURATED_DEVICE_DATABASE)) {
    if (cleanModel.includes(key) || key.includes(cleanModel)) {
      for (const [cKey, url] of Object.entries(colorMap)) {
        if (cKey !== 'default' && (cleanColor.includes(cKey) || cKey.includes(cleanColor))) {
          options.push({ url, label: `รูปภาพตรงรุ่น (${cKey})`, colorName: cKey });
        } else if (cKey !== 'default') {
          options.push({ url, label: `รูปภาพสี ${cKey}`, colorName: cKey });
        }
      }
      if (colorMap.default && !options.some(o => o.url === colorMap.default)) {
        options.push({ url: colorMap.default, label: 'รูปภาพมาตรฐานประจำรุ่น' });
      }
    }
  }

  // Common high quality stock renders for phones and tablets
  if (cleanModel.includes('tablet') || cleanModel.includes('pad') || cleanModel.includes('tab')) {
    options.push(
      { url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80', label: 'แท็บเล็ตสีเงิน (Silver Tab)' },
      { url: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600&auto=format&fit=crop&q=80', label: 'แท็บเล็ตสีเทาเข้ม (Space Gray)' },
      { url: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=600&auto=format&fit=crop&q=80', label: 'แท็บเล็ตสีโรสโกลด์ (Rose Gold)' }
    );
  } else {
    // Smartphone options
    options.push(
      { url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80', label: 'สมาร์ทโฟนสีดำเข้ม (Black / Titanium)' },
      { url: 'https://images.unsplash.com/photo-1695048133148-f8605ee71569?w=600&auto=format&fit=crop&q=80', label: 'สมาร์ทโฟนสีน้ำเงิน/ฟ้า (Blue)' },
      { url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80', label: 'สมาร์ทโฟนสีขาว/เขียวมิ้นต์ (White/Mint)' },
      { url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80', label: 'สมาร์ทโฟนดีไซน์โมเดิร์น (Modern Phone)' },
      { url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80', label: 'สมาร์ทโฟนสีพาสเทล/ชมพู (Pastel Pink)' }
    );
  }

  // Always offer the smart rendered SVG mockup as an option
  options.push({
    url: generateDeviceSvg(modelName, colorName),
    label: `ภาพเรนเดอร์จำลองสี "${colorName || 'มาตรฐาน'}"`
  });

  return options;
}

// Automatically resolve a product image
export function resolveProductImage(
  brandName: string,
  modelName: string,
  colorName: string = '',
  existingUrl?: string | null,
  category: 'Mobile' | 'Tablet' = 'Mobile'
): string | null {
  if (existingUrl === null) {
    return null; // Explicitly hidden
  }

  if (existingUrl && existingUrl.trim().length > 0 && !existingUrl.includes('placehold.co') && !existingUrl.includes('unsplash.com')) {
    return existingUrl;
  }

  const cleanModel = modelName.trim().toLowerCase();
  const cleanColor = colorName.trim().toLowerCase();
  
  // 1. Try to find an exact curated match
  for (const [key, colorMap] of Object.entries(CURATED_DEVICE_DATABASE)) {
    if (cleanModel.includes(key) || key.includes(cleanModel)) {
      // Find matching color
      for (const [cKey, url] of Object.entries(colorMap)) {
         if (cKey !== 'default' && (cleanColor.includes(cKey) || cKey.includes(cleanColor))) {
            return url;
         }
      }
      // Or default color for this model
      if (colorMap.default) return colorMap.default;
    }
  }

  // 2. Fallback to smart SVG mockup with the correct model name
  return generateDeviceSvg(modelName, colorName, category);
}
