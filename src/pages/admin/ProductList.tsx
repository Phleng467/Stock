import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Product, Brand } from '../../types';
import { Link } from 'react-router-dom';
import { Plus, Edit, EyeOff, Eye, Search } from 'lucide-react';
import { cn } from '../../components/ProductCard';

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [b, p] = await Promise.all([api.getBrands(), api.getProducts()]);
    setBrands(b);
    setProducts(p);
  };

  const toggleHide = async (product: Product) => {
    await api.saveProduct({ ...product, isHidden: !product.isHidden });
    fetchData();
  };

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase();
    const brandName = brands.find(b => b.id === p.brandId)?.name.toLowerCase() || '';
    return (
      p.model.toLowerCase().includes(q) ||
      brandName.includes(q) ||
      p.variants.some(v => 
        v.ram.toLowerCase().includes(q) || 
        v.rom.toLowerCase().includes(q) || 
        v.colors.some(c => c.sku.toLowerCase().includes(q))
      )
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">จัดการสินค้า</h1>
          <p className="text-xs text-zinc-500">จัดการรายการสต็อคสินค้าและสเปก</p>
        </div>
        <Link 
          to="/admin/products/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full text-xs font-bold active:scale-95 transition-all shadow-md shadow-zinc-900/15 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          เพิ่มสินค้าใหม่
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-zinc-200/80 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex justify-between items-center">
          <div className="relative w-72">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-400" />
            </div>
            <input
              type="text"
              placeholder="ค้นหา Model, SKU, Brand..."
              className="block w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-full text-xs bg-zinc-50/70 placeholder-zinc-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">แบรนด์</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รุ่น</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU / สี / ความจุ</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ราคาขาย</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map(p => {
                const brand = brands.find(b => b.id === p.brandId);
                return (
                  <tr key={p.id} className={p.isHidden ? 'opacity-60 bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{brand?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{p.model}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex flex-col gap-1">
                        {p.variants.map((v, i) => (
                          <div key={i} className="flex flex-col">
                            <span className="font-semibold text-gray-700">{v.ram ? `${v.ram}/` : ''}{v.rom}</span>
                            <div className="pl-2 flex gap-2 flex-wrap">
                              {v.colors.map((c, j) => (
                                <span key={j} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  {c.colorName} ({c.sku}) [{c.stock}]
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {p.variants[0]?.retailPrice.toLocaleString()} ฿
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {p.isHidden ? (
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">ซ่อน</span>
                      ) : (
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">เปิดใช้งาน</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link 
                          to={`/admin/products/edit/${p.id}`} 
                          className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                          title="แก้ไข"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => toggleHide(p)} 
                          className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-950 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                          title={p.isHidden ? "แสดงสินค้า" : "ซ่อนสินค้า"}
                        >
                          {p.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-zinc-400" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">ไม่พบสินค้า</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
