import { Product, Brand, DBState } from '../types';

const API_BASE = '/api';

export const api = {
  getBrands: async (): Promise<Brand[]> => {
    const res = await fetch(`${API_BASE}/brands`);
    return res.json();
  },
  getProducts: async (): Promise<Product[]> => {
    const res = await fetch(`${API_BASE}/products`);
    return res.json();
  },
  login: async (password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  },
  syncSheets: async (token: string) => {
    const res = await fetch(`${API_BASE}/sync/sheets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    if (!res.ok) throw new Error('Sync failed');
    return res.json();
  },
  fetchSpecs: async (model: string, category: string) => {
    const res = await fetch(`${API_BASE}/products/fetch-specs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, category })
    });
    if (!res.ok) throw new Error('Spec fetch failed');
    return res.json();
  },
  addProductsBulk: async (products: Partial<Product>[]) => {
    const res = await fetch(`${API_BASE}/products/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(products)
    });
    return res.json();
  },
  generateImageAI: async (prompt: string, aspectRatio?: string): Promise<{ url: string }> => {
    const res = await fetch(`${API_BASE}/ai/image/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspectRatio })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to generate image');
    }
    return res.json();
  },
  editImageAI: async (dataUrl: string, prompt?: string): Promise<{ url: string }> => {
    const res = await fetch(`${API_BASE}/ai/image/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, prompt })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to edit image');
    }
    return res.json();
  },
  saveProduct: async (product: Partial<Product>) => {
    const method = product.id ? 'PUT' : 'POST';
    const url = product.id ? `${API_BASE}/products/${product.id}` : `${API_BASE}/products`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    return res.json();
  },
  searchImages: async (params: { query?: string; brand?: string; model?: string; color?: string }) => {
    try {
      const res = await fetch(`${API_BASE}/products/search-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!res.ok) {
        return { results: [] };
      }
      return await res.json();
    } catch (e) {
      console.warn('searchImages api error:', e);
      return { results: [] };
    }
  },
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },
  uploadBase64Image: async (dataUrl: string) => {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl })
    });
    if (!res.ok) throw new Error('Upload base64 failed');
    return res.json();
  }
};
