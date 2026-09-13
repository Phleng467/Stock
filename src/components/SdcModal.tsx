import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Percent, Clock, AlertCircle, Calendar } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { api } from '../lib/api';
import { SdcPromotion } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SdcModal({ isOpen, onClose }: Props) {
  const getExpirationStatus = (durationStr: string) => {
    if (!durationStr || durationStr === '-') return { type: 'normal', text: durationStr };
    try {
      const parts = durationStr.split('.');
      if (parts.length >= 3) {
        const dayPart = parts[0].split('-');
        const endDay = parseInt(dayPart[dayPart.length - 1], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-indexed
        let year = parseInt(parts[2], 10);
        
        if (year < 100) year += 2500;
        if (year > 2400) year -= 543;
        
        const endDate = new Date(year, month, endDay, 23, 59, 59);
        const now = new Date();
        
        if (now > endDate) {
          return { type: 'expired', text: 'หมดระยะเวลาโปรโมชั่น' };
        }
        
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays <= 7 && diffDays > 0) {
          return { type: 'warning', text: `เหลือ ${diffDays} วันสุดท้าย` };
        }
      }
    } catch (e) {
      return { type: 'normal', text: durationStr };
    }
    return { type: 'normal', text: durationStr };
  };

  const [promotions, setPromotions] = useState<SdcPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'WARNING' | 'EXPIRED'>('ALL');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getSdcPromotions();
      setPromotions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPromotions = useMemo(() => {
    return promotions.filter(promo => {
      const s = search.toLowerCase();
      const matchesSearch = !search || 
        promo.brand.toLowerCase().includes(s) || 
        promo.model.toLowerCase().includes(s);
        
      if (!matchesSearch) return false;
      
      const status = getExpirationStatus(promo.duration);
      if (timeFilter === 'ALL') return true;
      if (timeFilter === 'WARNING') return status.type === 'warning';
      if (timeFilter === 'EXPIRED') return status.type === 'expired';
      
      return true;
    });
  }, [promotions, search, timeFilter]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[5%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-4xl bottom-[5%] bg-zinc-50 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-white px-4 sm:px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900 leading-tight">โปรโมชั่นช่วยดาวน์ SDC</h2>
                  <p className="text-xs sm:text-sm text-zinc-500">ตรวจสอบราคาและเงื่อนไขช่วยดาวน์</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Filters */}
            <div className="bg-white px-4 sm:px-6 py-3 border-b border-zinc-200 shrink-0">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="ค้นหา แบรนด์ หรือ รุ่น..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                />
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button 
                  onClick={() => setTimeFilter('ALL')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${timeFilter === 'ALL' ? 'bg-zinc-900 text-white shadow-sm' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  ทั้งหมด
                </button>
                <button 
                  onClick={() => setTimeFilter('WARNING')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${timeFilter === 'WARNING' ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  ใกล้หมดอายุ
                </button>
                <button 
                  onClick={() => setTimeFilter('EXPIRED')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${timeFilter === 'EXPIRED' ? 'bg-red-500 text-white shadow-sm' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  หมดอายุแล้ว
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-zinc-50">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                  <div className="w-8 h-8 border-4 border-zinc-200 border-t-blue-500 rounded-full animate-spin mb-4" />
                  <p className="text-sm font-medium">กำลังโหลดข้อมูล...</p>
                </div>
              ) : filteredPromotions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-3">
                  <Search className="w-12 h-12 text-zinc-300" />
                  <p className="text-sm font-medium">ไม่พบข้อมูลโปรโมชั่น</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4">
                  {filteredPromotions.map((promo) => {
                    const status = getExpirationStatus(promo.duration);
                    return (
                      <div 
                        key={promo.id} 
                        className={`bg-white p-4 rounded-xl border ${
                          status.type === 'expired' ? 'border-red-200 bg-red-50/30 opacity-75' : 
                          status.type === 'warning' ? 'border-amber-200 bg-amber-50/30' : 'border-zinc-200'
                        } shadow-sm hover:shadow-md transition-shadow relative overflow-hidden`}
                      >
                        {status.type === 'expired' && (
                          <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10">
                            หมดอายุ
                          </div>
                        )}
                        {status.type === 'warning' && (
                          <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10">
                            {status.text}
                          </div>
                        )}
                        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold uppercase tracking-wider">
                                {promo.brand}
                              </span>
                              <h3 className="font-bold text-zinc-900 text-base">{promo.model}</h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-600">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-zinc-900">ราคาปกติ:</span> ฿{promo.normalPrice?.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase">ช่วยดาวน์ SDC</span>
                              <span className="font-black text-blue-600">฿{promo.sdcAmount?.toLocaleString()}</span>
                            </div>
                            <div className="flex flex-col border-l border-zinc-200 pl-3">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase">รับเครื่อง</span>
                              <span className="font-black text-emerald-600">฿{promo.takeDeviceAmount?.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
                          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span>ระยะเวลา: <span className="font-medium text-zinc-700">{promo.duration}</span></span>
                          </div>
                          <div className="text-xs text-zinc-400">
                            {promo.note && <span className='truncate text-zinc-500'>หมายเหตุ: {promo.note}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
