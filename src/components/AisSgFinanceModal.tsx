import { motion, AnimatePresence } from 'motion/react';
import { X, Search, RotateCcw, AlertTriangle, AlertCircle, ChevronDown, Check } from 'lucide-react';
import { useState, useMemo, useEffect, ChangeEvent } from 'react';
import { api } from '../lib/api';
import { Product, Brand } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DOWN_PERCENTAGES = [0, 5, 10, 15, 20, 25, 30, 40, 50];
const DISCOUNTS = [
  { value: 0, label: 'ไม่มีส่วนลด' },
  { value: 1500, label: 'ส่วนลด 1,500 บาท' },
  { value: 2000, label: 'ส่วนลด 2,000 บาท' },
  { value: 2500, label: 'ส่วนลด 2,500 บาท' },
  { value: 3500, label: 'ส่วนลด 3,500 บาท' }
];

const PACKAGES = [
  { id: '1', name: '5G Max UNLIMITED 1,199', price: 1199, maxSpeed: 'Unlimited', continuous: 'Unlimited', voice: '350' },
  { id: '2', name: '5G Max Speed 899', price: 899, maxSpeed: '80GB', continuous: '6 Mbps', voice: '250' },
  { id: '3', name: '5G Max Speed 699', price: 699, maxSpeed: '50GB', continuous: '4 Mbps', voice: '150' },
  { id: '4', name: '5G Max Speed 499', price: 499, maxSpeed: '30GB', continuous: '1 Mbps', voice: '100' },
];

export default function AisSgFinanceModal({ isOpen, onClose }: Props) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedCapacity, setSelectedCapacity] = useState<string>('');
  
  // Gadget
  const [gadgetSearch, setGadgetSearch] = useState('');
  const [selectedGadgetPrice, setSelectedGadgetPrice] = useState<number>(0);
  
  // Calculations
  const [downPercent, setDownPercent] = useState<number>(0);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [helpDownRaw, setHelpDownRaw] = useState<string>('');
  
  // Package
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [b, p] = await Promise.all([api.getBrands(), api.getProducts()]);
      // Exclude iPhone, Apple, Samsung
      const excludedNames = ['iphone', 'apple', 'samsung'];
      const filteredBrands = b.filter(brand => !excludedNames.some(ex => brand.name.toLowerCase().includes(ex)));
      setBrands(filteredBrands);
      setProducts(p.filter(prod => !prod.isHidden));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedBrandId('');
    setSelectedModel('');
    setSelectedCapacity('');
    setGadgetSearch('');
    setSelectedGadgetPrice(0);
    setDownPercent(0);
    setDiscountValue(0);
    setHelpDownRaw('');
    setSelectedPackageId('');
  };

  // Derived options
  const availableModels = useMemo(() => {
    if (!selectedBrandId) return [];
    // Get unique models for this brand
    const brandProducts = products.filter(p => p.brandId === selectedBrandId);
    const uniqueModels = Array.from(new Set(brandProducts.map(p => p.model)));
    return uniqueModels.sort();
  }, [selectedBrandId, products]);

  const availableCapacities = useMemo(() => {
    if (!selectedBrandId || !selectedModel) return [];
    const modelProducts = products.filter(p => p.brandId === selectedBrandId && p.model === selectedModel);
    const brand = brands.find(b => b.id === selectedBrandId);
    const isApple = (brand?.name || '').toLowerCase().includes('apple') ||
                    (selectedModel || '').toLowerCase().includes('iphone') ||
                    (selectedModel || '').toLowerCase().includes('ipad');
    
    // Extract capacities from variants
    const capacities = new Set<string>();
    modelProducts.forEach(p => {
      p.variants.forEach(v => {
        if (isApple) {
          if (v.rom) capacities.add(v.rom);
        } else {
          if (v.ram && v.rom) capacities.add(`${v.ram}/${v.rom}`);
          else if (v.rom) capacities.add(v.rom);
        }
      });
    });
    
    return Array.from(capacities);
  }, [selectedBrandId, selectedModel, products, brands]);

  // Find base price
  const devicePrice = useMemo(() => {
    if (!selectedBrandId || !selectedModel) return 0;
    const modelProducts = products.filter(p => p.brandId === selectedBrandId && p.model === selectedModel);
    if (modelProducts.length === 0) return 0;
    
    const brand = brands.find(b => b.id === selectedBrandId);
    const isApple = (brand?.name || '').toLowerCase().includes('apple') ||
                    (selectedModel || '').toLowerCase().includes('iphone') ||
                    (selectedModel || '').toLowerCase().includes('ipad');

    // If capacity selected, try to find matching variant
    if (selectedCapacity) {
      for (const p of modelProducts) {
        for (const v of p.variants) {
          const cap = (!isApple && v.ram && v.rom) ? `${v.ram}/${v.rom}` : v.rom;
          if (cap === selectedCapacity) {
            return v.retailPrice || p.basePrice || 0;
          }
        }
      }
    }
    
    return modelProducts[0].basePrice || 0;
  }, [selectedBrandId, selectedModel, selectedCapacity, products]);

  const totalPrice = devicePrice + (Number(selectedGadgetPrice) || 0);
  const downPaymentAmount = (totalPrice * downPercent) / 100;
  const helpDownValue = Number(helpDownRaw.replace(/,/g, '')) || 0;
  const netPay = downPaymentAmount - discountValue - helpDownValue;
  const showWarning = netPay < 0;

  const handleHelpDownChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Remove non-digits
    const val = e.target.value.replace(/[^\d]/g, '');
    if (!val) {
      setHelpDownRaw('');
      return;
    }
    // Format with commas
    setHelpDownRaw(Number(val).toLocaleString());
  };

  const selectedPackage = PACKAGES.find(p => p.id === selectedPackageId);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl md:bottom-[5%] md:top-[5%] md:rounded-3xl bg-white/90 backdrop-blur-xl shadow-2xl z-[70] flex flex-col overflow-hidden rounded-t-3xl border border-white/40"
            style={{ maxHeight: '95vh' }}
          >
            {/* Header */}
            <div className="bg-white/80 px-6 py-5 flex items-center justify-between shrink-0 sticky top-0 z-10 border-b border-zinc-200/50">
              <div className="flex items-center gap-1.5 text-xl font-black tracking-tight">
                <span className="text-[#8DC63F]">AIS</span>
                <span className="text-zinc-400 font-bold mx-0.5 text-base">x</span>
                <span className="text-[#E3000F]">SG</span>
                <span className="text-[#005B9F]">FINANCE+</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 rounded-full transition-colors active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-8 scrollbar-hide">
              
              {/* 1. Device Info */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</div>
                  ข้อมูลตัวเครื่องและอุปกรณ์เสริม
                </h3>
                
                <div className="space-y-3 p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1.5">แบรนด์สมาร์ทโฟน</label>
                    <div className="relative">
                      <select 
                        className="w-full appearance-none bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-900"
                        value={selectedBrandId}
                        onChange={(e) => {
                          setSelectedBrandId(e.target.value);
                          setSelectedModel('');
                          setSelectedCapacity('');
                        }}
                      >
                        <option value="">-- เลือกแบรนด์ --</option>
                        {brands.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1.5">รุ่นสมาร์ทโฟน</label>
                    <div className="relative">
                      <select 
                        className="w-full appearance-none bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-900"
                        value={selectedModel}
                        onChange={(e) => {
                          setSelectedModel(e.target.value);
                          setSelectedCapacity('');
                        }}
                        disabled={!selectedBrandId}
                      >
                        <option value="">-- เลือกรุ่น --</option>
                        {availableModels.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>

                  {availableCapacities.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1.5">ขนาดความจุ</label>
                      <div className="relative">
                        <select 
                          className="w-full appearance-none bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-900"
                          value={selectedCapacity}
                          onChange={(e) => setSelectedCapacity(e.target.value)}
                        >
                          <option value="">-- เลือกความจุ --</option>
                          {availableCapacities.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-zinc-100">
                    <label className="block text-xs font-semibold text-zinc-500 mb-1.5">
                      Gadget ผ่อนร่วม <span className="text-red-500 font-medium">(ใส่กรณีผ่อนร่วมเท่านั้น)</span>
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="ค้นหา Gadget หรือราคา..." 
                        className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={gadgetSearch}
                        onChange={(e) => {
                          setGadgetSearch(e.target.value);
                          const num = Number(e.target.value.replace(/[^\d]/g, ''));
                          setSelectedGadgetPrice(num);
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-bold text-zinc-800 mb-1.5">ราคาเครื่องรวมทั้งหมด</label>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3.5 text-lg font-black text-blue-700 text-right">
                      ฿{totalPrice.toLocaleString()}
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. Down Payment & Discount */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">2</div>
                  กำหนดเงินดาวน์และส่วนลด
                </h3>
                
                <div className="space-y-5 p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-2.5">เปอร์เซ็นต์เงินดาวน์</label>
                    <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                      {DOWN_PERCENTAGES.map(pct => (
                        <button
                          key={pct}
                          onClick={() => setDownPercent(pct)}
                          className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                            downPercent === pct 
                              ? 'bg-zinc-900 text-white border-zinc-900 shadow-md' 
                              : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <label className="text-xs font-bold text-zinc-800">จำนวนเงินดาวน์</label>
                      <span className="text-[10px] text-red-500 font-medium">(ยังไม่รวมค่าธรรมเนียมสัญญา)</span>
                    </div>
                    <div className="bg-zinc-100 border border-zinc-200 rounded-xl px-4 py-3 text-base font-bold text-zinc-700 text-right">
                      ฿{downPaymentAmount.toLocaleString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1.5">ส่วนลดค่าเครื่อง</label>
                      <div className="relative">
                        <select 
                          className="w-full appearance-none bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-900"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(Number(e.target.value))}
                        >
                          {DISCOUNTS.map(d => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1.5">ช่วยดาวน์ (DP)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">฿</span>
                        <input 
                          type="text" 
                          placeholder="0" 
                          className="w-full pl-8 pr-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-900 text-right"
                          value={helpDownRaw}
                          onChange={handleHelpDownChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. AIS Package */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">3</div>
                  แพ็กเกจรายเดือน AIS
                </h3>
                
                <div className="space-y-4 p-4 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1.5">เลือกแพ็กเกจที่ต้องการ</label>
                    <div className="relative">
                      <select 
                        className="w-full appearance-none bg-green-50 border border-green-200 rounded-xl px-4 py-3.5 text-sm font-bold text-green-800 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                        value={selectedPackageId}
                        onChange={(e) => setSelectedPackageId(e.target.value)}
                      >
                        <option value="">-- เลือกแพ็กเกจรายเดือน --</option>
                        {PACKAGES.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (฿{p.price}/ด.)</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600 pointer-events-none" />
                    </div>
                  </div>

                  {selectedPackage && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-zinc-50 rounded-xl p-2.5 text-center border border-zinc-100">
                          <div className="text-[10px] text-zinc-500 mb-1">5G Max Speed</div>
                          <div className="text-xs font-bold text-zinc-800">{selectedPackage.maxSpeed}</div>
                        </div>
                        <div className="bg-zinc-50 rounded-xl p-2.5 text-center border border-zinc-100">
                          <div className="text-[10px] text-zinc-500 mb-1">ใช้ต่อเนื่อง</div>
                          <div className="text-xs font-bold text-zinc-800">{selectedPackage.continuous}</div>
                        </div>
                        <div className="bg-zinc-50 rounded-xl p-2.5 text-center border border-zinc-100">
                          <div className="text-[10px] text-zinc-500 mb-1">โทรฟรี (นาที)</div>
                          <div className="text-xs font-bold text-zinc-800">{selectedPackage.voice}</div>
                        </div>
                      </div>

                      <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-[11px] text-zinc-600 leading-relaxed">
                        <span className="font-bold text-zinc-800">เงื่อนไขแพ็กเกจ: </span>
                        สัญญาการใช้งาน 12 เดือน, ค่าบริการยังไม่รวมภาษีมูลค่าเพิ่ม 7%, สำหรับลูกค้าเปิดเบอร์ใหม่ ย้ายค่าย หรือเปลี่ยนจากเติมเงินเป็นรายเดือน
                      </div>
                    </motion.div>
                  )}
                </div>
              </section>

              {/* Extra space at bottom for scrolling past the fixed footer */}
              <div className="h-10"></div>
            </div>

            {/* Sticky Footer: Summary */}
            <div className="bg-white border-t border-zinc-200/60 p-5 sm:px-6 shrink-0 z-20 pb-safe">
              <div className="mb-4">
                <div className="flex justify-between items-end mb-1">
                  <div className="text-sm font-black text-red-600">ยอดที่ต้องชำระสุทธิ (บาท)</div>
                  <div className="text-[10px] text-zinc-500 font-medium mb-1">รวมค่าธรรมเนียมแล้ว</div>
                </div>
                <div className="text-4xl sm:text-5xl font-black text-zinc-900 tracking-tighter">
                  {Math.max(0, netPay).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {showWarning && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-800 leading-relaxed">
                    <span className="font-bold block mb-1 text-sm">⚠️ มียอดคงเหลือ {Math.abs(netPay).toLocaleString()} บาท</span>
                    รับสิทธิ์ส่วนลดทันที! เพียงเลือกสินค้า Gadget เพิ่มเติมที่สาขา ให้ครบตามเงื่อนไขที่กำหนด
                  </div>
                </motion.div>
              )}

              <button 
                onClick={handleReset}
                className="w-full py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                เริ่มทำรายการใหม่ทั้งหมด
              </button>
            </div>
            
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
