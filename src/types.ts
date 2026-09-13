export interface Brand {
  id: string;
  name: string;
  order: number;
  isHidden: boolean;
}

export interface ProductColor {
  id: string;
  colorName: string;
  sku: string;
  stock: number;
  imageUrl: string;
}

export interface ProductVariant {
  id: string;
  ram: string;
  rom: string;
  retailPrice: number;
  wholesalePrice: number | null;
  colors: ProductColor[];
}

export interface Product {
  id: string;
  brandId: string;
  model: string;
  category: 'Mobile' | 'Tablet';
  detail: string; // Wi-Fi, 4G, 5G for tablets
  specs: Record<string, string>;
  isHidden: boolean;
  variants: ProductVariant[];
}

export interface Settings {
  lowStockThreshold: number;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
}

export interface DBState {
  brands: Brand[];
  products: Product[];
  settings: Settings;
}

