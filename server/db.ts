import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data.json');

export interface DBState {
  users: any[];
  brands: any[];
  products: any[];
  settings: any;
  promotions: any[];
}

const defaultState: DBState = {
  users: [{ id: 'admin', username: 'admin', password: 'password', role: 'master' }],
  brands: [
    { id: 'b1', name: 'Apple', order: 1, isHidden: false },
    { id: 'b2', name: 'Samsung', order: 2, isHidden: false },
    { id: 'b3', name: 'OPPO', order: 3, isHidden: false },
    { id: 'b4', name: 'vivo', order: 4, isHidden: false },
    { id: 'b5', name: 'Xiaomi', order: 5, isHidden: false }
  ],
  products: [],
  settings: { lowStockThreshold: 5, syncStatus: 'idle' },
  promotions: [
    { id: 'p1', url: 'https://lh3.googleusercontent.com/d/1Z6fzVIUoBnHFNez6D0HBDhEf_QXLyKgf' },
    { id: 'p2', url: 'https://lh3.googleusercontent.com/d/1znNOJ8wCYGpoZJJo3ub_Q_C30MQ1Zmx8' }
  ]
};

export function readDB(): DBState {
  if (!fs.existsSync(DB_FILE)) {
    writeDB(defaultState);
    return defaultState;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return defaultState;
  }
}

export function writeDB(state: DBState) {
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
}
