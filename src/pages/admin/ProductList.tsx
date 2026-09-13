import { useState, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import { api } from '../../lib/api';
import { Product, Brand } from '../../types';
import { Link } from 'react-router-dom';
import { Plus, Edit, EyeOff, Eye, Search, X, Smartphone, Tablet, Filter, PackageSearch, Sparkles, Hash, Upload, Loader2, PackageOpen, Trash2, RotateCcw } from 'lucide-react';
import { cn } from '../../components/ProductCard';
import QuickStockModal from '../../components/QuickStockModal';

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'Mobile' | 'Tablet'>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VISIBLE' | 'HIDDEN'>('ALL');
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
  const [importingCsv, setImportingCsv] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Stock Edit Modal state
  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(null);
  const [quickStockOpen, setQuickStockOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [b, p] = await Promise.all([api.getBrands(), api.getProducts()]);
    setBrands(b);
    setProducts(p);
  };

  const handleImportCsv = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportingCsv(true);
      const text = await file.text();
      const rows = text.split('\n').filter(r => r.trim());
      if (rows.length < 2) throw new Error("ไฟล์ CSV ไม่มีข้อมูล");

      const headerRow = rows[0].split(',').map(h => h.trim().toLowerCase());
      
      const newProducts: Partial<Product>[] = [];

      for (let i = 1; i < rows.length; i++) {
        // Use a simple regex to split CSV respecting quotes
        const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        const cols = rows[i].split(regex).map(c => c.trim().replace(/^"|"$/g, ''));
        
        if (cols.length < 3) continue;

        const brandName = cols[headerRow.indexOf('brand')] || cols[1] || '';
        const brandObj = brands.find(b => b.name.toLowerCase() === brandName.toLowerCase());
        const brandId = brandObj ? brandObj.id : (brands[0]?.id || 'unknown');

        const model = cols[headerRow.indexOf('model')] || cols[2] || 'New Product';
        const categoryStr = cols[headerRow.indexOf('category')] || cols[3] || 'Mobile';
        const basePriceStr = cols[headerRow.indexOf('base price')] || cols[4] || '0';
        const costPriceStr = cols[headerRow.indexOf('cost price')] || cols[5] || '0';
        const desc = cols[headerRow.indexOf('description')] || cols[6] || '';
        
        // Handle image URL and wholesale toggles if they exist (simplification for bulk upload)
        // Usually you'd map these to variants, but for a basic CSV, we'll create one default variant
        
        const newProduct: Partial<Product> = {
          brandId,
          model,
          category: categoryStr.includes('Tablet') ? 'Tablet' : 'Mobile',
          description: desc,
          basePrice: parseFloat(basePriceStr),
          costPrice: parseFloat(costPriceStr),
          isHidden: false,
          variants: [{
            id: Math.random().toString(36).substring(7),
            ram: '',
            rom: '',
            retailPrice: parseFloat(basePriceStr),
            wholesalePrice: null, // Default null for wholesale price toggle
            colors: [{
              id: Math.random().toString(36).substring(7),
              colorName: 'Default',
              sku: '',
              stock: 0,
              imageUrl: null // No image by default
            }]
          }]
        };
        newProducts.push(newProduct);
      }

      await api.addProductsBulk(newProducts);
      await fetchData();
      alert(`นำเข้าข้อมูลสินค้าสำเร็จ ${newProducts.length} รายการ!`);
    } catch (err: any) {
      console.error(err);
      alert('นำเข้าไฟล์ CSV ไม่สำเร็จ: ' + err.message);
    } finally {
      setImportingCsv(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleHide = async (product: Product) => {
    await api.saveProduct({ ...product, isHidden: !product.isHidden });
    fetchData();
  };

  const deleteProduct = async (product: Product) => {
    if (confirm(`คุณต้องการลบ ${product.model} ใช่หรือไม่? (ย้ายไปถังขยะ 30 วัน)`)) {
      await api.deleteProduct(product.id);
      fetchData();
    }
  };

  const restoreProduct = async (product: Product) => {
    await api.restoreProduct(product.id);
    fetchData();
  };

  // Real-time filtering by Name, ITEM CODE, Brand, Specs, and Category
  const displayedProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return products.filter(p => {
      // Trash / Active view filter
      if (viewMode === 'active' && p.deletedAt) return false;
      if (viewMode === 'trash' && !p.deletedAt) return false;

      // Category filter
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }

      // Brand filter
      if (selectedBrand !== 'ALL' && p.brandId !== selectedBrand) {
        return false;
      }

      // Status filter (Visible / Hidden)
      if (statusFilter === 'VISIBLE' && p.isHidden) {
        return false;
      }
      if (statusFilter === 'HIDDEN' && !p.isHidden) {
        return false;
      }

      // Real-time query search
      if (!q) return true;

      const brand = brands.find(b => b.id === p.brandId);
      const brandName = brand?.name.toLowerCase() || '';
      const modelName = p.model.toLowerCase();

      // Check if matches model name or brand
      if (modelName.includes(q) || brandName.includes(q)) {
        return true;
      }

      // Check if matches category or detail
      if (p.category.toLowerCase().includes(q) || (p.detail && p.detail.toLowerCase().includes(q))) {
        return true;
      }

      // Check if matches any variant ram/rom or any color's ITEM CODE / colorName
      return p.variants.some(v => {
        const ramMatch = v.ram?.toLowerCase().includes(q);
        const romMatch = v.rom?.toLowerCase().includes(q);
        const colorOrSkuMatch = v.colors.some(c => {
          const skuMatch = c.sku ? c.sku.toLowerCase().includes(q) : false;
          const colorMatch = c.colorName ? c.colorName.toLowerCase().includes(q) : false;
          return skuMatch || colorMatch;
        });
        return ramMatch || romMatch || colorOrSkuMatch;
      });
    });
  }, [products, brands, searchQuery, selectedCategory, selectedBrand, statusFilter]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedBrand('ALL');
    setStatusFilter('ALL');
  };

  const isSkuMatched = (sku: string) => {
    if (!searchQuery.trim()) return false;
    return sku?.toLowerCase().includes(searchQuery.toLowerCase().trim());
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">จัดการสินค้า</h1>
          <p className="text-xs text-zinc-500">จัดการรายการสต็อคสินค้า สเปก และรหัส ITEM CODE</p>
        </div>
        <div className="flex gap-2">
          <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-full text-xs font-bold active:scale-95 transition-all shadow-sm cursor-pointer shrink-0">
            {importingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {importingCsv ? 'กำลังนำเข้า...' : 'อัปโหลด CSV'}
            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCsv} disabled={importingCsv} />
          </label>
          <Link 
            to="/admin/products/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full text-xs font-bold active:scale-95 transition-all shadow-md shadow-zinc-900/15 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            เพิ่มสินค้าใหม่
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl shadow-xs border border-zinc-200/80 overflow-hidden">
        {/* Active / Trash Tabs */}
        <div className="flex border-b border-zinc-200/80">
          <button
            onClick={() => setViewMode('active')}
            className={cn(
              "flex-1 py-3 text-xs font-bold text-center transition-colors border-b-2",
              viewMode === 'active' ? "border-zinc-900 text-zinc-900 bg-white" : "border-transparent text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 bg-zinc-50/50"
            )}
          >
            สินค้าที่ใช้งานอยู่
          </button>
          <button
            onClick={() => setViewMode('trash')}
            className={cn(
              "flex-1 py-3 text-xs font-bold text-center transition-colors border-b-2",
              viewMode === 'trash' ? "border-red-600 text-red-600 bg-white" : "border-transparent text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 bg-zinc-50/50"
            )}
          >
            ถังขยะ (เก็บ 30 วัน)
          </button>
        </div>

        {/* Real-time Search & Filter Toolbar */}
        <div className="p-4 border-b border-zinc-100 space-y-3 bg-zinc-50/40">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Real-time Search Input */}
            <div className="relative flex-1 max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="ค้นหาแบบ Real-time: ชื่อรุ่น, รหัส ITEM CODE, แบรนด์ (เช่น SM-A15, IP16, 256GB)..."
                className="block w-full pl-10 pr-10 py-2.5 border border-zinc-200/90 rounded-full text-xs bg-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:border-red-500 transition-all shadow-2xs font-medium text-zinc-900"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-700 cursor-pointer"
                  title="ล้างคำค้นหา"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Brand Dropdown Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 hidden sm:inline">แบรนด์:</span>
              <select
                value={selectedBrand}
                onChange={e => setSelectedBrand(e.target.value)}
                className="px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white text-zinc-800 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer shadow-2xs"
              >
                <option value="ALL">ทุกแบรนด์ ({products.length})</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({products.filter(p => p.brandId === b.id).length})
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-zinc-200 rounded-xl text-xs bg-white text-zinc-800 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer shadow-2xs"
              >
                <option value="ALL">สถานะทั้งหมด</option>
                <option value="VISIBLE">เฉพาะเปิดขาย</option>
                <option value="HIDDEN">เฉพาะที่ซ่อน</option>
              </select>
            </div>
          </div>

          {/* Secondary Filter Row: Category Tabs & Result Count */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-100">
            {/* Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer",
                  selectedCategory === 'ALL'
                    ? "bg-zinc-900 text-white shadow-2xs"
                    : "bg-white text-zinc-600 hover:bg-zinc-200/70 border border-zinc-200/70"
                )}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('Mobile')}
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer",
                  selectedCategory === 'Mobile'
                    ? "bg-red-600 text-white shadow-2xs"
                    : "bg-white text-zinc-600 hover:bg-zinc-200/70 border border-zinc-200/70"
                )}
              >
                <Smartphone className="w-3 h-3" />
                มือถือ
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('Tablet')}
                className={cn(
                  "inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer",
                  selectedCategory === 'Tablet'
                    ? "bg-red-600 text-white shadow-2xs"
                    : "bg-white text-zinc-600 hover:bg-zinc-200/70 border border-zinc-200/70"
                )}
              >
                <Tablet className="w-3 h-3" />
                แท็บเล็ต
              </button>
            </div>

            {/* Results Count & Active Filter Indicator */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-zinc-600">
                แสดง <strong className="text-zinc-900">{displayedProducts.length}</strong> จากทั้งหมด {products.length} รุ่น
              </span>
              {(searchQuery || selectedCategory !== 'ALL' || selectedBrand !== 'ALL' || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-red-600 hover:text-red-700 hover:underline font-bold cursor-pointer text-xs ml-1"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">แบรนด์</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">รุ่นสินค้า</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-zinc-400" />
                    <span>ITEM CODE / สี / ความจุ / สต็อค</span>
                  </div>
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ราคาขาย</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">สถานะ</th>
                <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">จัดการ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {displayedProducts.map(p => {
                const brand = brands.find(b => b.id === p.brandId);
                const totalStock = p.variants.reduce((acc, v) => acc + v.colors.reduce((s, c) => s + (c.stock || 0), 0), 0);
                const minPrice = Math.min(...p.variants.map(v => v.retailPrice));
                const maxPrice = Math.max(...p.variants.map(v => v.retailPrice));

                return (
                  <tr key={p.id} className={cn("hover:bg-zinc-50/60 transition-colors", p.isHidden ? 'opacity-60 bg-gray-50/70' : '')}>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-zinc-700">
                      <span className="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-800 font-bold border border-zinc-200/60">
                        {brand?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900 leading-tight">
                          {p.model}
                        </span>
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.2 bg-zinc-100 rounded text-[10px] text-zinc-600 font-medium">
                            {p.category === 'Mobile' ? 'มือถือ' : 'แท็บเล็ต'}
                          </span>
                          {p.detail && <span>• {p.detail}</span>}
                          <span>• รวม {totalStock} เครื่อง</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-600 max-w-md">
                      <div className="space-y-2">
                        {p.variants.map((v, i) => (
                          <div key={i} className="flex flex-col gap-1 border-l-2 border-zinc-200 pl-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-800 text-[11px]">
                                {v.ram ? `${v.ram}/` : ''}{v.rom}
                              </span>
                              <span className="text-[10px] text-zinc-400">
                                ฿{v.retailPrice.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex gap-1.5 flex-wrap">
                              {v.colors.map((c, j) => {
                                const skuMatch = isSkuMatched(c.sku);
                                return (
                                  <button
                                    key={j}
                                    type="button"
                                    onClick={() => {
                                      setQuickStockProduct(p);
                                      setQuickStockOpen(true);
                                    }}
                                    className={cn(
                                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-all cursor-pointer hover:border-red-400 hover:shadow-2xs active:scale-95 text-left",
                                      skuMatch 
                                        ? "bg-amber-100 text-amber-900 border-amber-400 font-bold shadow-2xs ring-2 ring-amber-300/40"
                                        : "bg-zinc-100/90 text-zinc-700 border-zinc-200/70"
                                    )}
                                    title={`คลิกแก้ไขสต็อคด่วน | ITEM CODE: ${c.sku || 'ไม่มี'} | สต็อค: ${c.stock || 0} เครื่อง`}
                                  >
                                    <span>{c.colorName}</span>
                                    {c.sku && (
                                      <span className={cn(
                                        "font-mono text-[10px] px-1 rounded",
                                        skuMatch ? "bg-amber-200 text-amber-950 font-black" : "text-zinc-500"
                                      )}>
                                        {c.sku}
                                      </span>
                                    )}
                                    <span className={cn(
                                      "text-[10px] font-bold px-1 rounded-full",
                                      c.stock > 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                                    )}>
                                      {c.stock}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-900 font-bold">
                      {minPrice === maxPrice ? (
                        <span>฿{minPrice.toLocaleString()}</span>
                      ) : (
                        <span>฿{minPrice.toLocaleString()} - ฿{maxPrice.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {p.isHidden ? (
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                           ซ่อน
                         </span>
                      ) : (
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                           เปิดขาย
                         </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                      <div className="flex justify-end gap-1.5 sm:gap-2">
                        {viewMode === 'active' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickStockProduct(p);
                                setQuickStockOpen(true);
                              }}
                              className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-2xs border border-red-200/60"
                              title="ปรับปรุงจำนวนสต็อคแบบด่วน (Quick Stock Edit)"
                            >
                              <PackageOpen className="w-3.5 h-3.5" />
                            </button>
                            <Link 
                              to={`/admin/products/edit/${p.id}`} 
                              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-2xs"
                              title="แก้ไขข้อมูลสินค้าและสต็อคเต็มรูปแบบ"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Link>
                            <button 
                              type="button"
                              onClick={() => toggleHide(p)} 
                              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-950 flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-2xs"
                              title={p.isHidden ? "คลิกเพื่อเปิดแสดงสินค้า" : "คลิกเพื่อซ่อนสินค้า"}
                            >
                              {p.isHidden ? <Eye className="w-3.5 h-3.5 text-zinc-400" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-700" />}
                            </button>
                            <button 
                              type="button"
                              onClick={() => deleteProduct(p)} 
                              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-red-100 text-zinc-500 hover:text-red-600 flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-2xs"
                              title="ย้ายไปถังขยะ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => restoreProduct(p)} 
                            className="w-auto px-3 h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center gap-1.5 justify-center active:scale-90 transition-all cursor-pointer shadow-2xs border border-emerald-200/60 font-semibold"
                            title="กู้คืนสินค้านี้กลับไปที่ใช้งานอยู่"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> กู้คืน
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Empty state */}
              {displayedProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
                        <PackageSearch className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-zinc-900">ไม่พบรายการสินค้าที่ค้นหา</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        {searchQuery ? (
                          <>ไม่พบสินค้าที่มีชื่อรุ่น, แบรนด์ หรือรหัส ITEM CODE ตรงกับ <span className="font-semibold text-zinc-800 font-mono">"{searchQuery}"</span></>
                        ) : (
                          <>ไม่มีสินค้าในหมวดหมู่หรือเงื่อนไขที่เลือก</>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-full shadow-md active:scale-95 transition-all cursor-pointer mt-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        ล้างคำค้นหาและตัวกรองทั้งหมด
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Stock Edit Modal */}
      <QuickStockModal
        isOpen={quickStockOpen}
        onClose={() => {
          setQuickStockOpen(false);
          setQuickStockProduct(null);
        }}
        product={quickStockProduct}
        brandName={brands.find(b => b.id === quickStockProduct?.brandId)?.name}
        onSuccess={(updated) => {
          setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
        }}
      />
    </div>
  );
}
