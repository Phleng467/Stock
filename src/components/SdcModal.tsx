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
      setLoading(true);
      api.getSdcPromotions().then(data => {
        setPromotions(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [isOpen]);

  const { activePromotions, expiredPromotions } = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = promotions.filter(p => 
       p.brand.toLowerCase().includes(q) || 
       p.model.toLowerCase().includes(q)
    );

    const active: (SdcPromotion & { statusObj: { type: string, text: string } })[] = [];
    const expired: (SdcPromotion & { statusObj: { type: string, text: string } })[] = [];

    filtered.forEach(p => {
      const statusObj = getExpirationStatus(p.duration);
      if (statusObj.type === 'expired') {
        expired.push({ ...p, statusObj });
      } else {
        active.push({ ...p, statusObj });
      }
    });

    return { activePromotions: active, expiredPromotions: expired };
  }, [promotions, search]);

  let displayActive = activePromotions;
  let displayExpired = expiredPromotions;

  if (timeFilter === 'WARNING') {
    displayActive = activePromotions.filter(p => p.statusObj.type === 'warning');
    displayExpired = [];
  } else if (timeFilter === 'EXPIRED') {
    displayActive = [];
  }

  const renderCard = (p: SdcPromotion & { statusObj: { type: string, text: string } }, i: number) => (
    <div key={p.id || i} className={`bg-white rounded-2xl border ${p.statusObj.type === 'expired' ? 'border-red-200 bg-red-50/50' : 'border-zinc-200'} p-4 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${p.statusObj.type === 'expired' ? 'text-red-500' : 'text-blue-600'}`}>{p.brand}</span>
          <h3 className="text-base font-bold text-zinc-900 mt-0.5">{p.model}</h3>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
        <div>
          <p className="text-[10px] text-zinc-500 font-medium">ราคาปกติ</p>
          <p className="text-sm font-semibold text-zinc-800">฿{p.normalPrice?.toLocaleString() || '-'}</p>
        </div>
        <div>
          <p className="text-[10px] text-blue-500 font-medium">ช่วยดาวน์ SDC</p>
          <p className="text-sm font-bold text-blue-600">฿{p.sdcAmount?.toLocaleString() || '-'}</p>
        </div>
        <div>
          <p className="text-[11px] text-red-600 font-bold uppercase tracking-wide">รับเครื่อง</p>
          <p className="text-xl font-black text-red-600 drop-shadow-sm">฿{p.takeDeviceAmount?.toLocaleString() || '-'}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 font-medium">ระยะเวลา</p>
          {(() => {
            const status = p.statusObj;
            if (status.type === 'expired') {
              return <p className="text-sm font-bold text-red-600 animate-pulse">{status.text}</p>;
            }
            if (status.type === 'warning') {
              return <p className="text-sm font-bold text-amber-500 animate-pulse">{status.text}</p>;
            }
            return <p className="text-sm font-medium text-zinc-700">{status.text}</p>;
          })()}
        </div>
      </div>
      {p.note && (
        <div className="mt-3 pt-3 border-t border-zinc-100/80">
          <p className="text-[11px] text-zinc-500">
            <span className="font-semibold text-zinc-700">หมายเหตุ:</span> {p.note}
          </p>
        </div>
      )}
    </div>
  );

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
                  <Clock className="w-3.5 h-3.5" />
                  เหลือ 7 วันสุดท้าย
                </button>
                <button 
                  onClick={() => setTimeFilter('EXPIRED')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${timeFilter === 'EXPIRED' ? 'bg-red-500 text-white shadow-sm' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  หมดระยะเวลา
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-50/50">
              {loading ? (
                <div className="flex justify-center items-center h-40 text-zinc-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
                </div>
              ) : (displayActive.length === 0 && displayExpired.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-40 text-zinc-500 gap-2">
                  <Percent className="w-8 h-8 opacity-20" />
                  <p>ไม่พบข้อมูลโปรโมชั่น</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Active & Warning */}
                  {displayActive.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {displayActive.map((p, i) => renderCard(p, i))}
                    </div>
                  )}

                  {/* Divider for Expired */}
                  {displayExpired.length > 0 && timeFilter === 'ALL' && displayActive.length > 0 && (
                    <div className="flex items-center justify-center py-2">
                      <div className="flex-1 border-t border-dashed border-red-200"></div>
                      <span className="px-3 text-xs font-bold text-red-400 uppercase tracking-wider bg-zinc-50">ส่วนที่หมดอายุแล้ว</span>
                      <div className="flex-1 border-t border-dashed border-red-200"></div>
                    </div>
                  )}

                  {/* Expired */}
                  {displayExpired.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {displayExpired.map((p, i) => renderCard(p, i))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
