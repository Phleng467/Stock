import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Product, Brand } from '../../types';
import { Package, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [b, p] = await Promise.all([api.getBrands(), api.getProducts()]);
    setBrands(b);
    setProducts(p);
  };

  const handleSync = async () => {
    // In a real app we would use Google Identity Services to get a fresh token.
    // We'll simulate sync trigger here assuming token was provided or stored.
    setSyncing(true);
    try {
      // Fake a token or trigger oauth flow here in real implementation
      await api.syncSheets('MOCK_TOKEN');
      setSyncStatus('ซิงค์สำเร็จ');
    } catch (err) {
      setSyncStatus('การซิงค์ล้มเหลว');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  // Compute stats
  let totalProducts = products.length;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  products.forEach(p => {
    p.variants.forEach(v => {
      v.colors.forEach(c => {
        if (c.stock === 0) outOfStockCount++;
        else if (c.stock <= 5) lowStockCount++; // assuming 5 is threshold
      });
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">ภาพรวมระบบ (Dashboard)</h1>
        <div className="flex items-center gap-4">
          {syncStatus && <span className="text-sm font-medium text-gray-600">{syncStatus}</span>}
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 font-medium text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'กำลัง Sync...' : 'Sync Google Sheets'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Package className="w-6 h-6"/></div>
            <div>
              <p className="text-sm font-medium text-gray-500">จำนวนรุ่นสินค้า</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalProducts}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><AlertTriangle className="w-6 h-6"/></div>
            <div>
              <p className="text-sm font-medium text-gray-500">สินค้าใกล้หมด (Stock {"<="} 5)</p>
              <h3 className="text-2xl font-bold text-gray-900">{lowStockCount}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg"><AlertCircle className="w-6 h-6"/></div>
            <div>
              <p className="text-sm font-medium text-gray-500">สินค้าหมด (Stock = 0)</p>
              <h3 className="text-2xl font-bold text-gray-900">{outOfStockCount}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Basic list of items near out of stock */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">รายการสินค้า Stock ต่ำ</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">แบรนด์</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รุ่น</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ความจุ / สี</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ITEM CODE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.flatMap(p => 
                p.variants.flatMap(v => 
                  v.colors.filter(c => c.stock <= 5).map(c => (
                    <tr key={c.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{brands.find(b=>b.id===p.brandId)?.name || ''}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.model}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{v.ram ? `${v.ram}/` : ''}{v.rom} - {c.colorName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.sku}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">{c.stock}</td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
