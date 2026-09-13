import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Percent } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { api } from '../lib/api';
import { SdcPromotion } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SdcModal({ isOpen, onClose }: Props) {
  const [promotions, setPromotions] = useState<SdcPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.getSdcPromotions().then(data => {
        setPromotions(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [isOpen]);

  const filteredPromotions = useMemo(() => {
    const q = search.toLowerCase();
    return promotions.filter(p => 
      p.brand.toLowerCase().includes(q) || 
      p.model.toLowerCase().includes(q)
    );
  }, [promotions, search]);

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

            {/* Search */}
            <div className="bg-white px-4 sm:px-6 py-3 border-b border-zinc-200 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="ค้นหา แบรนด์ หรือ รุ่น..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {loading ? (
                <div className="flex justify-center items-center h-40 text-zinc-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
                </div>
              ) : filteredPromotions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-zinc-500 gap-2">
                  <Percent className="w-8 h-8 opacity-20" />
                  <p>ไม่พบข้อมูลโปรโมชั่น</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPromotions.map((p, i) => (
                    <div key={p.id || i} className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{p.brand}</span>
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
                          <p className="text-[10px] text-green-600 font-medium">รับเครื่อง</p>
                          <p className="text-sm font-bold text-green-600">฿{p.takeDeviceAmount?.toLocaleString() || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 font-medium">ระยะเวลา</p>
                          <p className="text-sm font-medium text-zinc-700">{p.duration || '-'}</p>
                        </div>
                      </div>
                      {p.note && (
                        <div className="mt-3 pt-3 border-t border-zinc-100">
                          <p className="text-[11px] text-zinc-500">
                            <span className="font-semibold text-zinc-700">หมายเหตุ:</span> {p.note}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
