import { useState, useEffect, useMemo, useRef, ChangeEvent } from 'react';
import Papa from 'papaparse';
import { api } from '../../lib/api';
import { Product, Brand } from '../../types';
import { Link } from 'react-router-dom';
import { Plus, Edit, EyeOff, Eye, Search, X, Smartphone, Tablet, Filter, PackageSearch, Sparkles, Hash, Upload, Loader2, PackageOpen, Trash2, RotateCcw, Save } from 'lucide-react';
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

  // CSV Preview State
  const [csvPreviewData, setCsvPreviewData] = useState<Partial<Product>[]>([]);
  const [csvPreviewOpen, setCsvPreviewOpen] = useState(false);
  const [csvSelectedIndices, setCsvSelectedIndices] = useState<number[]>([]);

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

    setImportingCsv(true);

    Papa.parse(file, {
      encoding: "UTF-8", // Or "windows-874" if Thai Excel format, but we'll try to let Papa handle it.
      // We will remove the strict header checking which fails on weird invisible characters
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: async (results) => {
        try {
          const newProducts: Partial<Product>[] = [];

          for (let i = 0; i < results.data.length; i++) {
            const row: any = results.data[i];
            
            // Handle both English and Thai column names
            
            // Find keys dynamically to avoid hidden characters/BOM issues
            const keys = Object.keys(row);
            const getVal = (matches: string[]) => {
              const foundKey = keys.find(k => matches.some(m => k.toLowerCase().includes(m.toLowerCase())));
              return foundKey ? (row[foundKey] || '') : '';
            };

            const brandName = getVal(['brand', 'แบรนด์']).toString().trim();
            const model = getVal(['model', 'รุ่น']).toString().trim();
            const capacity = getVal(['capacity', 'ความจุ']).toString().trim();
            const color = getVal(['color', 'สี']).toString().trim() || 'Default';
            const itemCode = getVal(['item code', 'รหัสสินค้า', 'item_code']).toString().trim();
            const stockStr = getVal(['stock', 'จำนวน']).toString().replace(/,/g, '') || '0';
            const categoryStr = getVal(['category', 'หมวดหมู่']).toString().trim() || 'Mobile';
            const basePriceStr = getVal(['ราคาปกติ', 'base price']).toString().replace(/,/g, '') || '0';
            const costPriceStr = getVal(['ราคาขายส่ง', 'ต้นทุน', 'cost price', 'wholesale']).toString().replace(/,/g, '') || '0';
            const desc = getVal(['description', 'รายละเอียด']).toString().trim();

            
            if (!model) continue; // Skip if no model name

            const brandObj = brands.find(b => b.name.toLowerCase() === brandName.toLowerCase());
            const brandId = brandObj ? brandObj.id : (brands[0]?.id || 'unknown');
            
            let ram = '';
            let rom = capacity;
            if (capacity.includes('/')) {
              const parts = capacity.split('/');
              ram = parts[0].trim();
              rom = parts.slice(1).join('/').trim();
            }

            const parsedStock = parseInt(stockStr, 10) || 0;
            const parsedBasePrice = parseFloat(basePriceStr) || 0;
            const parsedCostPrice = parseFloat(costPriceStr) || 0;

            const newProduct: Partial<Product> = {
              brandId,
              model,
              category: categoryStr.toLowerCase().includes('tablet') || categoryStr === 'แท็บเล็ต' ? 'Tablet' : 'Mobile',
              description: desc,
              basePrice: parsedBasePrice,
              costPrice: parsedCostPrice,
              isHidden: false,
              variants: [{
                id: Math.random().toString(36).substring(7),
                ram: ram,
                rom: rom,
                retailPrice: parsedBasePrice,
                wholesalePrice: parsedCostPrice,
                colors: [{
                  id: Math.random().toString(36).substring(7),
                  colorName: color || 'Default',
                  sku: itemCode,
                  stock: parsedStock,
                  imageUrl: null
                }]
              }]
            };
            newProducts.push(newProduct);
          }

          if (newProducts.length === 0) {
             alert('ไม่พบข้อมูล หรือหัวคอลัมน์ไม่ถูกต้อง กรุณาใช้หัวคอลัมน์: ITEM CODE, แบรนด์, รุ่น, ความจุ, สี, จำนวน, หมวดหมู่, ราคาปกติ, ราคาขายส่ง, รายละเอียด');
             setImportingCsv(false);
             if (fileInputRef.current) fileInputRef.current.value = '';
             return;
          }

          setCsvPreviewData(newProducts);
          setCsvSelectedIndices([]);
          setCsvPreviewOpen(true);
        } catch (err: any) {
          console.error(err);
          alert('ประมวลผลไฟล์ CSV ไม่สำเร็จ: ' + err.message);
        } finally {
          setImportingCsv(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        alert('ไม่สามารถอ่านไฟล์ CSV ได้');
        setImportingCsv(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
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
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">จัดการสินค้า</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">จัดการรายการสต็อคสินค้า สเปก และรหัส ITEM CODE</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => alert('รูปแบบไฟล์ CSV ที่รองรับ:\n\nคอลัมน์ (ภาษาไทย):\nITEM CODE, แบรนด์, รุ่น, ความจุ, สี, จำนวน, หมวดหมู่, ราคาปกติ, ราคาขายส่ง, รายละเอียด\n\nตัวอย่าง:\nIP15P256TIT, Apple, iPhone 15 Pro, 8/256, Titanium, 10, Mobile, 39900, 35000, เครื่องศูนย์ไทย')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-full text-xs font-bold active:scale-95 transition-all shadow-sm cursor-pointer shrink-0"
          >
            วิธีทำ CSV
          </button>
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
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xs border border-zinc-200 dark:border-zinc-700/80 overflow-hidden">
        {/* Active / Trash Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-700/80">
          <button
            onClick={() => setViewMode('active')}
            className={cn(
              "flex-1 py-3 text-xs font-bold text-center transition-colors border-b-2",
              viewMode === 'active' ? "border-zinc-900 text-zinc-900 dark:text-white bg-white dark:bg-zinc-900" : "border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50 hover:text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50/50"
            )}
          >
            สินค้าที่ใช้งานอยู่
          </button>
          <button
            onClick={() => setViewMode('trash')}
            className={cn(
              "flex-1 py-3 text-xs font-bold text-center transition-colors border-b-2",
              viewMode === 'trash' ? "border-red-600 text-red-600 bg-white dark:bg-zinc-900" : "border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50 hover:text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50/50"
            )}
          >
            ถังขยะ (เก็บ 30 วัน)
          </button>
        </div>

        {/* Real-time Search & Filter Toolbar */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3 bg-zinc-50 dark:bg-zinc-800/50/40">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Real-time Search Input */}
            <div className="relative flex-1 max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="ค้นหาแบบ Real-time: ชื่อรุ่น, รหัส ITEM CODE, แบรนด์ (เช่น SM-A15, IP16, 256GB)..."
                className="block w-full pl-10 pr-10 py-2.5 border border-zinc-200 dark:border-zinc-700/90 rounded-full text-xs bg-white dark:bg-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:border-red-500 transition-all shadow-2xs font-medium text-zinc-900 dark:text-white"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  title="ล้างคำค้นหา"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Brand Dropdown Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 hidden sm:inline">แบรนด์:</span>
              <select
                value={selectedBrand}
                onChange={e => setSelectedBrand(e.target.value)}
                className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer shadow-2xs"
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
                className="px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer shadow-2xs"
              >
                <option value="ALL">สถานะทั้งหมด</option>
                <option value="VISIBLE">เฉพาะเปิดขาย</option>
                <option value="HIDDEN">เฉพาะที่ซ่อน</option>
              </select>
            </div>
          </div>

          {/* Secondary Filter Row: Category Tabs & Result Count */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            {/* Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer",
                  selectedCategory === 'ALL'
                    ? "bg-zinc-900 text-white shadow-2xs"
                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 border border-zinc-200 dark:border-zinc-700/70"
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
                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 border border-zinc-200 dark:border-zinc-700/70"
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
                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 border border-zinc-200 dark:border-zinc-700/70"
                )}
              >
                <Tablet className="w-3 h-3" />
                แท็บเล็ต
              </button>
            </div>

            {/* Results Count & Active Filter Indicator */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                แสดง <strong className="text-zinc-900 dark:text-white">{displayedProducts.length}</strong> จากทั้งหมด {products.length} รุ่น
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
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
            <thead className="bg-gray-50 dark:bg-zinc-800/50/80">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">แบรนด์</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">รุ่นสินค้า</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-zinc-400" />
                    <span>ITEM CODE / สี / ความจุ / สต็อค</span>
                  </div>
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">ราคาขาย</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">สถานะ</th>
                <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">จัดการ</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-100 dark:divide-zinc-800">
              {displayedProducts.map(p => {
                const brand = brands.find(b => b.id === p.brandId);
                const totalStock = p.variants.reduce((acc, v) => acc + v.colors.reduce((s, c) => s + (c.stock || 0), 0), 0);
                const minPrice = Math.min(...p.variants.map(v => v.retailPrice));
                const maxPrice = Math.max(...p.variants.map(v => v.retailPrice));

                return (
                  <tr key={p.id} className={cn("hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50/60 transition-colors", p.isHidden ? 'opacity-60 bg-gray-50 dark:bg-zinc-800/50/70' : '')}>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 font-bold border border-zinc-200 dark:border-zinc-700/60">
                        {brand?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                          {p.model}
                        </span>
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
                            {p.category === 'Mobile' ? 'มือถือ' : 'แท็บเล็ต'}
                          </span>
                          {p.detail && <span>• {p.detail}</span>}
                          <span>• รวม {totalStock} เครื่อง</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-600 dark:text-zinc-400 max-w-md">
                      <div className="space-y-2">
                        {p.variants.map((v, i) => (
                          <div key={i} className="flex flex-col gap-1 border-l-2 border-zinc-200 dark:border-zinc-700 pl-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-800 dark:text-zinc-100 text-[11px]">
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
                                        : "bg-zinc-100 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700/70"
                                    )}
                                    title={`คลิกแก้ไขสต็อคด่วน | ITEM CODE: ${c.sku || 'ไม่มี'} | สต็อค: ${c.stock || 0} เครื่อง`}
                                  >
                                    <span>{c.colorName}</span>
                                    {c.sku && (
                                      <span className={cn(
                                        "font-mono text-[10px] px-1 rounded",
                                        skuMatch ? "bg-amber-200 text-amber-950 font-black" : "text-zinc-500 dark:text-zinc-400"
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
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-900 dark:text-white font-bold">
                      {minPrice === maxPrice ? (
                        <span>฿{minPrice.toLocaleString()}</span>
                      ) : (
                        <span>฿{minPrice.toLocaleString()} - ฿{maxPrice.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {p.isHidden ? (
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
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
                              className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-2xs"
                              title="แก้ไขข้อมูลสินค้าและสต็อคเต็มรูปแบบ"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Link>
                            <button 
                              type="button"
                              onClick={() => toggleHide(p)} 
                              className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-2xs"
                              title={p.isHidden ? "คลิกเพื่อเปิดแสดงสินค้า" : "คลิกเพื่อซ่อนสินค้า"}
                            >
                              {p.isHidden ? <Eye className="w-3.5 h-3.5 text-zinc-400" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />}
                            </button>
                            <button 
                              type="button"
                              onClick={() => deleteProduct(p)} 
                              className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-red-100 text-zinc-500 dark:text-zinc-400 hover:text-red-600 flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-2xs"
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
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <PackageSearch className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">ไม่พบรายการสินค้าที่ค้นหา</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        {searchQuery ? (
                          <>ไม่พบสินค้าที่มีชื่อรุ่น, แบรนด์ หรือรหัส ITEM CODE ตรงกับ <span className="font-semibold text-zinc-800 dark:text-zinc-100 font-mono">"{searchQuery}"</span></>
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

      {/* CSV Preview Modal */}
      {csvPreviewOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">ตรวจสอบข้อมูลก่อนนำเข้า</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">พบข้อมูลทั้งหมด {csvPreviewData.length} รายการ (เลือกเพื่อซ่อนหรือลบรายการที่ไม่ต้องการก่อนนำเข้า)</p>
              </div>
              <button onClick={() => setCsvPreviewOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700 flex flex-wrap gap-3 items-center justify-between">
               <div className="flex items-center gap-2 px-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none hover:text-blue-600 transition-colors">
                    <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                      checked={csvSelectedIndices.length === csvPreviewData.length && csvPreviewData.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCsvSelectedIndices(csvPreviewData.map((_, i) => i));
                        } else {
                          setCsvSelectedIndices([]);
                        }
                      }}
                    />
                    เลือกทั้งหมด
                  </label>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm ml-2">เลือก {csvSelectedIndices.length} รายการ</span>
               </div>
               <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setCsvPreviewData(prev => prev.map((p, i) => csvSelectedIndices.includes(i) ? { ...p, isHidden: true } : p));
                    }}
                    disabled={csvSelectedIndices.length === 0}
                    className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-bold disabled:opacity-50 transition-all flex items-center gap-1.5"
                  >
                    <EyeOff className="w-3.5 h-3.5" /> ซ่อนที่เลือก
                  </button>
                  <button 
                    onClick={() => {
                      if(window.confirm('ยืนยันลบรายการที่เลือกจากรายการนำเข้า?')) {
                        setCsvPreviewData(prev => prev.filter((_, i) => !csvSelectedIndices.includes(i)));
                        setCsvSelectedIndices([]);
                      }
                    }}
                    disabled={csvSelectedIndices.length === 0}
                    className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold disabled:opacity-50 transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> ลบที่เลือก
                  </button>
               </div>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 sticky top-0 border-b border-zinc-200 dark:border-zinc-700 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 w-10"></th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">ITEM CODE</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">แบรนด์/รุ่น</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">ความจุ/สี</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-right">ราคาปกติ</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-right">ราคาขายส่ง</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-center">สต็อค</th>
                    <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {csvPreviewData.map((p, idx) => {
                    const brandName = brands.find(b => b.id === p.brandId)?.name || 'Unknown';
                    const isSelected = csvSelectedIndices.includes(idx);
                    return (
                    <tr key={idx} className={isSelected ? 'bg-blue-50/40' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50 transition-colors'}>
                      <td className="px-4 py-3">
                        <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) setCsvSelectedIndices(prev => [...prev, idx]);
                            else setCsvSelectedIndices(prev => prev.filter(i => i !== idx));
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                         <div className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded inline-block">{p.variants?.[0]?.colors?.[0]?.sku || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                         <div className="font-bold text-zinc-900 dark:text-white">{p.model}</div>
                         <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">{brandName}</div>
                      </td>
                      <td className="px-4 py-3">
                         <div className="text-zinc-800 dark:text-zinc-100 font-medium text-[13px]">{p.variants?.[0]?.ram ? `${p.variants[0].ram}/${p.variants[0].rom}` : p.variants?.[0]?.rom}</div>
                         <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{p.variants?.[0]?.colors?.[0]?.colorName}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-right text-zinc-700 dark:text-zinc-300">฿{p.basePrice?.toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600 text-right">฿{p.costPrice?.toLocaleString()}</td>
                      <td className="px-4 py-3 font-black text-blue-600 text-center">{p.variants?.[0]?.colors?.[0]?.stock}</td>
                      <td className="px-4 py-3 text-center">
                         {p.isHidden ? <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold uppercase rounded-full">ซ่อน</span> : <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-full">แสดง</span>}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
              {csvPreviewData.length === 0 && (
                <div className="p-12 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 gap-3">
                  <PackageOpen className="w-12 h-12 text-zinc-300" />
                  <p className="font-medium text-sm">ไม่มีข้อมูล หรือถูกลบหมดแล้ว</p>
                </div>
              )}
            </div>
            
            <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-700 flex justify-end gap-3 bg-white dark:bg-zinc-900 rounded-b-2xl">
               <button onClick={() => setCsvPreviewOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 active:scale-95 transition-all">ยกเลิก</button>
               <button 
                 disabled={importingCsv || csvPreviewData.length === 0}
                 onClick={async () => {
                   try {
                     setImportingCsv(true);
                     await api.addProductsBulk(csvPreviewData);
                     await fetchData();
                     alert(`นำเข้าข้อมูลสินค้าสำเร็จ ${csvPreviewData.length} รายการ!`);
                     setCsvPreviewOpen(false);
                   } catch (err: any) {
                     console.error(err);
                     alert('นำเข้าไฟล์ CSV ไม่สำเร็จ: ' + err.message);
                   } finally {
                     setImportingCsv(false);
                   }
                 }}
                 className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {importingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                 ยืนยันนำเข้า {csvPreviewData.length} รายการ
               </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
