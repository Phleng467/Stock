import { useState, useEffect, useMemo, useCallback, MouseEvent } from 'react';
import { Search, Loader2, LogIn, X, Smartphone, Tablet, SlidersHorizontal, RotateCcw, Sparkles, History, Layers, Calculator, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Product, Brand } from '../types';
import ProductCard from '../components/ProductCard';
import { cn } from '../components/ProductCard';
import PromotionModal from '../components/PromotionModal';
import CompareModal from '../components/CompareModal';
import Chatbot from '../components/Chatbot';

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'Mobile' | 'Tablet'>('ALL');
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [comparedProductIds, setComparedProductIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareToast, setCompareToast] = useState<string | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('jaymart_recent_searches');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.filter(s => typeof s === 'string' && s.trim()).slice(0, 5));
        }
      }
    } catch (e) {
      console.error('Error loading recent searches:', e);
    }
  }, []);

  const saveSearchQuery = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('jaymart_recent_searches', JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving recent searches:', e);
      }
      return updated;
    });
  }, []);

  // Debounce save search query when user types
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) return;
    const timer = setTimeout(() => {
      saveSearchQuery(trimmed);
    }, 1200);
    return () => clearTimeout(timer);
  }, [searchQuery, saveSearchQuery]);

  const handleSelectRecentSearch = (query: string) => {
    setSearchQuery(query);
    saveSearchQuery(query);
  };

  const removeRecentSearch = (queryToRemove: string, e?: MouseEvent) => {
    e?.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(q => q !== queryToRemove);
      try {
        localStorage.setItem('jaymart_recent_searches', JSON.stringify(updated));
      } catch (err) {
        console.error('Error updating recent searches:', err);
      }
      return updated;
    });
  };

  const clearRecentSearches = (e?: MouseEvent) => {
    e?.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem('jaymart_recent_searches');
    } catch (err) {
      console.error('Error clearing recent searches:', err);
    }
  };

  // Compare products logic (up to 3 items)
  const handleToggleCompare = useCallback((product: Product) => {
    setComparedProductIds((prev) => {
      if (prev.includes(product.id)) {
        return prev.filter((id) => id !== product.id);
      }
      if (prev.length >= 3) {
        setCompareToast('สามารถเลือกเปรียบเทียบได้สูงสุด 3 รุ่น');
        setTimeout(() => setCompareToast(null), 3200);
        return prev;
      }
      return [...prev, product.id];
    });
  }, []);

  const handleRemoveComparedProduct = useCallback((productId: string) => {
    setComparedProductIds((prev) => prev.filter((id) => id !== productId));
  }, []);

  const handleClearAllCompared = useCallback(() => {
    setComparedProductIds([]);
  }, []);

  const comparedProducts = useMemo(() => {
    return comparedProductIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p));
  }, [comparedProductIds, products]);

  useEffect(() => {
    Promise.all([api.getBrands(), api.getProducts()]).then(([b, p]) => {
      setBrands(b.filter(brand => !brand.isHidden));
      setProducts(p.filter(prod => !prod.isHidden));
      setLoading(false);

      // Auto show promotion popup if not dismissed today
      try {
        const today = new Date().toISOString().slice(0, 10);
        const isDismissed = localStorage.getItem('hide_jaymart_promo_' + today);
        if (!isDismissed) {
          setTimeout(() => {
            setShowPromoModal(true);
          }, 600);
        }
      } catch (e) {
        setShowPromoModal(true);
      }
    });
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Category filter
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }

      // Brand filter
      if (activeBrand && p.brandId !== activeBrand) {
        return false;
      }

      // Search query (matches name, brand, category, specs, variants)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const brandName = brands.find(b => b.id === p.brandId)?.name.toLowerCase() || '';
        const modelName = p.model.toLowerCase();
        const categoryName = p.category.toLowerCase();

        // Thai category synonyms
        const isMobileSearch = ['มือถือ', 'โทรศัพท์', 'สมาร์ทโฟน', 'phone', 'mobile'].some(term => term.includes(q) || q.includes(term));
        const isTabletSearch = ['แท็บเล็ต', 'แทบเล็ต', 'ไอแพด', 'ipad', 'tablet'].some(term => term.includes(q) || q.includes(term));

        const matchCategorySynonym = (isMobileSearch && p.category === 'Mobile') || (isTabletSearch && p.category === 'Tablet');

        const matchBasic = (
          modelName.includes(q) ||
          brandName.includes(q) ||
          categoryName.includes(q) ||
          matchCategorySynonym ||
          p.detail?.toLowerCase().includes(q) ||
          p.variants.some(v => 
            v.ram.toLowerCase().includes(q) || 
            v.rom.toLowerCase().includes(q) || 
            v.retailPrice.toString().includes(q) ||
            v.colors.some(c => c.colorName.toLowerCase().includes(q) || c.sku.toLowerCase().includes(q))
          )
        );

        return matchBasic;
      }

      return true;
    });
  }, [products, brands, searchQuery, activeBrand, selectedCategory]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setActiveBrand(null);
  };

  const isLoggedIn = !!localStorage.getItem('token');

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 max-w-xs text-center">
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shadow-xl shadow-red-500/15 border-2 border-red-500/30 bg-white p-1 flex items-center justify-center animate-bounce" style={{ animationDuration: '1.6s' }}>
              <img 
                src="/branch_logo.jpg" 
                alt="เจมาร์ท สาขาโรบินสันสุรินทร์" 
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <span className="absolute -inset-2 rounded-full bg-red-500/15 blur-md -z-10 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-zinc-900 tracking-wide">เจมาร์ท สาขาโรบินสันสุรินทร์</h2>
            <p className="text-xs font-semibold text-red-600">กำลังโหลดรายการสต็อคสินค้า...</p>
            <p className="text-[10px] text-zinc-400">JAYMART ROBINSON SURIN</p>
          </div>
          <div className="flex gap-1.5 pt-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-zinc-300 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Bar: Brand / Logo + Search Bar + Login Button */}
          <div className="flex justify-between items-center h-16 gap-3 sm:gap-6">
            {/* Logo / Brand Name */}
            <div 
              className="flex items-center gap-2.5 cursor-pointer shrink-0 group" 
              onClick={clearFilters}
              title="เจมาร์ท สาขาโรบินสันสุรินทร์ (คลิกเพื่อรีเซ็ต)"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-white border border-red-200/80 shadow-xs p-0.5 shrink-0 group-hover:scale-105 transition-transform duration-200">
                <img 
                  src="/branch_logo.jpg" 
                  alt="เจมาร์ท สาขาโรบินสันสุรินทร์" 
                  className="w-full h-full object-contain rounded-full" 
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm sm:text-base font-black tracking-tight text-gray-900 group-hover:text-red-600 transition-colors flex items-center gap-1.5">
                  Jaymart
                  <span className="text-[10px] sm:text-xs font-bold text-white bg-red-600 px-2 py-0.5 rounded-full shadow-2xs">
                    สาขาโรบินสันสุรินทร์
                  </span>
                </span>
                <span className="text-[10px] text-gray-400 font-medium">ชั้น 2 • สต็อคและผ่อนสินค้า</span>
              </div>
            </div>

            {/* Desktop / Tablet Search Bar */}
            <div className="hidden sm:flex flex-1 max-w-xl">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-10 py-2 text-sm border border-gray-200 rounded-full bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-2xs"
                  placeholder="ค้นหาชื่อรุ่น หรือ หมวดหมู่ (เช่น iPhone 15, มือถือ, Samsung)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      saveSearchQuery(searchQuery);
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    title="ล้างคำค้นหา"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Login / Admin Action - Unobstructed and always visible */}
            <div className="flex items-center shrink-0">
              <Link 
                to={isLoggedIn ? "/admin" : "/login"} 
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 active:scale-95 px-3.5 py-1.5 rounded-full border border-zinc-200 shadow-2xs transition-all duration-150"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <LogIn className="w-3.5 h-3.5 text-zinc-500" /> 
                <span>{isLoggedIn ? 'จัดการระบบ' : 'เข้าสู่ระบบ'}</span>
              </Link>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="sm:hidden pb-2.5">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-10 py-2 text-xs border border-zinc-200/80 rounded-full bg-zinc-50/80 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-2xs"
                placeholder="ค้นหาชื่อรุ่น หรือ หมวดหมู่..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    saveSearchQuery(searchQuery);
                  }
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Recent Searches & Promotion Bar (below search bar) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 pt-0.5">
            {/* Recent Searches Chips */}
            {recentSearches.length > 0 ? (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 shrink-0">
                  <History className="w-3 h-3 text-zinc-400" />
                  <span>ค้นหาล่าสุด:</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                  {recentSearches.map((term) => {
                    const isCurrent = searchQuery.toLowerCase().trim() === term.toLowerCase().trim();
                    return (
                      <span
                        key={term}
                        onClick={() => handleSelectRecentSearch(term)}
                        className={cn(
                          "group/chip inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer active:scale-95 shadow-2xs select-none",
                          isCurrent
                            ? "bg-red-600 text-white font-semibold shadow-xs"
                            : "bg-zinc-100 hover:bg-zinc-200/90 text-zinc-700 hover:text-zinc-900 border border-zinc-200/80"
                        )}
                        title={`คลิกเพื่อค้นหา "${term}"`}
                      >
                        <Search className={cn(
                          "w-2.5 h-2.5 transition-colors",
                          isCurrent ? "text-white" : "text-zinc-400 group-hover/chip:text-red-500"
                        )} />
                        <span className="max-w-[120px] sm:max-w-[160px] truncate">{term}</span>
                        <button
                          type="button"
                          onClick={(e) => removeRecentSearch(term, e)}
                          className={cn(
                            "rounded-full p-0.5 transition-colors cursor-pointer ml-0.5",
                            isCurrent
                              ? "hover:bg-red-700 text-white/80 hover:text-white"
                              : "hover:bg-zinc-300/60 text-zinc-400 hover:text-red-600"
                          )}
                          title={`ลบ "${term}"`}
                          aria-label={`ลบ ${term}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-[10px] text-zinc-400 hover:text-red-600 hover:underline shrink-0 ml-1 cursor-pointer transition-colors"
                  title="ล้างประวัติการค้นหาล่าสุดทั้งหมด"
                >
                  ล้าง
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-zinc-400 hidden sm:flex items-center gap-1.5 py-0.5">
                <Sparkles className="w-3 h-3 text-red-500" />
                <span>พิมพ์ค้นหารุ่นสินค้า เช่น iPhone, S24, Reno เพื่อตรวจสอบสต็อค</span>
              </div>
            )}

            {/* Promotion & Calculator Actions */}
            <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
              <a
                href="https://installment-calculator.pchindasook.workers.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/80 active:scale-95 px-3 py-1.5 rounded-full border border-blue-200 transition-all duration-150 whitespace-nowrap cursor-pointer shadow-2xs"
                title="เครื่องคำนวณเงินผ่อน • Samsung Finance+"
              >
                <Calculator className="w-3.5 h-3.5 text-blue-600" />
                <span>คำนวณผ่อน</span>
                <ExternalLink className="w-2.5 h-2.5 text-blue-400" />
              </a>

              <button
                onClick={() => setShowPromoModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 active:scale-95 px-3 py-1.5 rounded-full border border-red-200 transition-all duration-150 whitespace-nowrap cursor-pointer shadow-2xs"
                title="ดูโปรโมชั่นพิเศษ"
              >
                <Sparkles className="w-3.5 h-3.5 text-red-500" />
                <span>โปรโมชั่น</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category & Brand Navigation Bar */}
        <div className="border-t border-zinc-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
            {/* Category Quick Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1 hidden sm:inline">หมวด:</span>
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 active:scale-95 whitespace-nowrap cursor-pointer",
                  selectedCategory === 'ALL'
                    ? "bg-zinc-900 text-white shadow-sm shadow-zinc-900/20 scale-[1.02]"
                    : "bg-zinc-100/90 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                )}
              >
                ✨ ทั้งหมด
              </button>
              <button
                onClick={() => setSelectedCategory('Mobile')}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 active:scale-95 flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                  selectedCategory === 'Mobile'
                    ? "bg-red-600 text-white shadow-sm shadow-red-500/25 scale-[1.02]"
                    : "bg-zinc-100/90 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                )}
              >
                <Smartphone className="w-3.5 h-3.5" /> มือถือ
              </button>
              <button
                onClick={() => setSelectedCategory('Tablet')}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 active:scale-95 flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                  selectedCategory === 'Tablet'
                    ? "bg-red-600 text-white shadow-sm shadow-red-500/25 scale-[1.02]"
                    : "bg-zinc-100/90 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                )}
              >
                <Tablet className="w-3.5 h-3.5" /> แท็บเล็ต
              </button>
            </div>

            {/* Brand Nav */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-hide border-t md:border-t-0 pt-2 md:pt-0 border-zinc-100">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1 hidden sm:inline">แบรนด์:</span>
              <button 
                onClick={() => setActiveBrand(null)}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap transition-all duration-150 active:scale-95 cursor-pointer", 
                  activeBrand === null 
                    ? "bg-zinc-900 text-white shadow-xs scale-105" 
                    : "text-zinc-600 hover:text-zinc-900 bg-zinc-100/70 hover:bg-zinc-200/70"
                )}
              >
                ทุกแบรนด์
              </button>
              {brands.map(brand => (
                <button
                  key={brand.id}
                  onClick={() => setActiveBrand(activeBrand === brand.id ? null : brand.id)}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap transition-all duration-150 active:scale-95 cursor-pointer", 
                    activeBrand === brand.id 
                    ? "bg-zinc-900 text-white shadow-xs scale-105" 
                    : "text-zinc-600 hover:text-zinc-900 bg-zinc-100/70 hover:bg-zinc-200/70"
                  )}
                >
                  {brand.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* Results summary bar when filter/search is applied - Without numbers */}
        {(searchQuery || selectedCategory !== 'ALL' || activeBrand !== null) && (
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5 pb-3 border-b border-gray-200/60">
            <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
              <span className="font-semibold text-gray-900">ผลการค้นหา:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                  คำค้น: <strong className="text-gray-800 font-medium">"{searchQuery}"</strong>
                  <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedCategory !== 'ALL' && (
                <span className="inline-flex items-center gap-1 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                  หมวดหมู่: <strong className="text-gray-800 font-medium">{selectedCategory === 'Mobile' ? 'มือถือ' : 'แท็บเล็ต'}</strong>
                  <button onClick={() => setSelectedCategory('ALL')} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {activeBrand && (
                <span className="inline-flex items-center gap-1 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                  แบรนด์: <strong className="text-gray-800 font-medium">{brands.find(b => b.id === activeBrand)?.name}</strong>
                  <button onClick={() => setActiveBrand(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-red-600 font-medium bg-zinc-100/80 hover:bg-red-50/80 px-3 py-1 rounded-full border border-zinc-200/60 active:scale-95 transition-all duration-150 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> ล้างตัวกรอง
            </button>
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-zinc-200/80 shadow-xs max-w-md mx-auto my-8 p-8">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4 text-zinc-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-1">ไม่พบสินค้าที่ตรงกับการค้นหา</h3>
            <p className="text-xs text-zinc-500 mb-5">
              ลองตรวจสอบการสะกดชื่อรุ่น หรือเลือกค้นหาด้วยหมวดหมู่ "มือถือ" หรือ "แท็บเล็ต"
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-full shadow-md shadow-zinc-900/15 active:scale-95 transition-all duration-150 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> แสดงสินค้าทั้งหมด
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4 md:gap-5">
            {filteredProducts.map((product, idx) => {
              const brand = brands.find(b => b.id === product.brandId);
              return (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  brandName={brand?.name || 'Unknown'} 
                  index={idx}
                  isCompared={comparedProductIds.includes(product.id)}
                  onToggleCompare={handleToggleCompare}
                  compareDisabled={comparedProductIds.length >= 3 && !comparedProductIds.includes(product.id)}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Compare Dock (when 1 or more items selected) */}
      <AnimatePresence>
        {comparedProducts.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94vw] max-w-2xl bg-zinc-900/95 text-white p-2.5 sm:p-3 rounded-2xl sm:rounded-full border border-white/20 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4"
          >
            {/* Left: Selected items preview */}
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto py-0.5 scrollbar-hide">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-xs font-semibold shrink-0">
                <Layers className="w-3.5 h-3.5 text-red-400" />
                <span>เปรียบเทียบ {comparedProducts.length}/3</span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                {comparedProducts.map((p) => {
                  const b = brands.find((br) => br.id === p.brandId);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 bg-zinc-800 border border-white/10 rounded-full pl-2.5 pr-1.5 py-1 text-[11px] font-medium shrink-0 group"
                    >
                      <span className="max-w-[85px] sm:max-w-[120px] truncate text-zinc-200">
                        {b?.name} {p.model}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveComparedProduct(p.id)}
                        className="w-4 h-4 rounded-full bg-zinc-700 hover:bg-red-600 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title={`ลบ ${p.model}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center justify-end gap-2 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10">
              <button
                type="button"
                onClick={handleClearAllCompared}
                className="text-[11px] text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title="ล้างการเลือกทั้งหมด"
              >
                ล้างทั้งหมด
              </button>

              <button
                type="button"
                onClick={() => setShowCompareModal(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-lg shadow-red-600/40 transition-all cursor-pointer whitespace-nowrap"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>เปรียบเทียบสเปก ({comparedProducts.length})</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compare Toast Notification */}
      <AnimatePresence>
        {compareToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl border border-white/20"
          >
            {compareToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer info */}
      <footer className="bg-white border-t border-gray-200 mt-auto py-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-red-200 shadow-2xs p-0.5 shrink-0 flex items-center justify-center">
            <img 
              src="/branch_logo.jpg" 
              alt="เจมาร์ท สาขาโรบินสันสุรินทร์" 
              className="w-full h-full object-contain rounded-full" 
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-center sm:text-left">
            <span className="font-bold text-gray-800">เจมาร์ท (Jaymart) สาขาโรบินสันสุรินทร์ ชั้น 2</span>
            <span className="hidden sm:inline text-gray-300">•</span>
            <span className="text-gray-400">ระบบตรวจสอบสต็อคสินค้าและข้อมูลผ่อนชำระ</span>
          </div>
        </div>
      </footer>

      {/* Promotion Popup Modal */}
      <PromotionModal
        isOpen={showPromoModal}
        onClose={() => setShowPromoModal(false)}
      />

      {/* Compare Modal */}
      <CompareModal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        products={comparedProducts}
        brands={brands}
        onRemoveProduct={handleRemoveComparedProduct}
        onClearAll={handleClearAllCompared}
      />

      {/* Floating Chatbot */}
      <Chatbot />
    </div>
  );
}