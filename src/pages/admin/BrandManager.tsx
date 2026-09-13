import { useState, useEffect, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { Brand } from '../../types';
import { Plus, EyeOff, Eye, Save } from 'lucide-react';

export default function BrandManager() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [newBrandName, setNewBrandName] = useState('');

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    const data = await api.getBrands();
    setBrands(data);
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!newBrandName) return;
    await fetch('/api/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newBrandName, order: brands.length + 1, isHidden: false })
    });
    setNewBrandName('');
    fetchBrands();
  };

  const toggleHide = async (brand: Brand) => {
    await fetch(`/api/brands/${brand.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isHidden: !brand.isHidden })
    });
    fetchBrands();
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const current = brands[index];
    const prev = brands[index - 1];
    
    await fetch(`/api/brands/${current.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ order: prev.order }) });
    await fetch(`/api/brands/${prev.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ order: current.order }) });
    fetchBrands();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">จัดการแบรนด์</h1>

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 p-6">
        <form onSubmit={handleAdd} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">เพิ่มแบรนด์ใหม่</label>
            <input
              type="text"
              value={newBrandName}
              onChange={e => setNewBrandName(e.target.value)}
              placeholder="เช่น Apple, Samsung..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            />
          </div>
          <button type="submit" className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark font-medium text-sm transition-colors">
            <Plus className="w-4 h-4 mr-2" /> เพิ่ม
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase">ลำดับ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase">แบรนด์</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase">สถานะ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase">จัดการ</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200">
            {brands.map((brand, i) => (
              <tr key={brand.id} className={brand.isHidden ? 'opacity-60 bg-gray-50 dark:bg-zinc-800/50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-zinc-400 font-medium">{brand.order}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-bold">{brand.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {brand.isHidden ? (
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-100">ซ่อน</span>
                  ) : (
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">เปิดใช้งาน</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-3 items-center">
                    {i > 0 && (
                      <button onClick={() => moveUp(i)} className="text-gray-400 hover:text-gray-900 dark:text-white text-xs">
                        เลื่อนขึ้น
                      </button>
                    )}
                    <button onClick={() => toggleHide(brand)} className="text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:text-zinc-300">
                      {brand.isHidden ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
