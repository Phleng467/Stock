import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, ArrowDownRight, CheckCircle, Info, ShieldAlert } from 'lucide-react';

export interface MarginViolation {
  variantId: string;
  variantLabel: string;
  retailPrice: number;
  wholesalePrice: number;
  lossAmount: number;
}

export interface ToastItem {
  id: string;
  type: 'margin_warning' | 'error' | 'success' | 'info';
  title: string;
  message?: string;
  violations?: MarginViolation[];
  onScrollToVariant?: (variantId: string) => void;
  duration?: number;
}

interface AdminToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function AdminToast({ toasts, onDismiss }: AdminToastProps) {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-md w-full px-4 sm:px-0 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="pointer-events-auto w-full"
          >
            {toast.type === 'margin_warning' ? (
              <div className="bg-red-950/95 text-white rounded-2xl border border-red-500/40 shadow-2xl shadow-red-950/50 backdrop-blur-md p-4 overflow-hidden relative">
                {/* Accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />

                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-red-400">
                        Margin Alert • คำเตือนกำไรขั้นต้น
                      </h4>
                      <p className="text-sm font-bold text-white leading-tight">
                        {toast.title}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDismiss(toast.id)}
                    className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title="ปิดการแจ้งเตือน"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {toast.message && (
                  <p className="text-xs text-red-200/90 mb-3">
                    {toast.message}
                  </p>
                )}

                {/* Violations breakdown */}
                {toast.violations && toast.violations.length > 0 && (
                  <div className="space-y-1.5 my-2.5 bg-black/30 rounded-xl p-2.5 border border-white/5">
                    {toast.violations.map((v, i) => (
                      <div
                        key={v.variantId || i}
                        className="flex items-center justify-between text-xs py-1 px-1.5 border-b border-white/5 last:border-0"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-zinc-200 block truncate">
                            {v.variantLabel}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            ขายปลีก: ฿{v.retailPrice.toLocaleString()} | ราคาส่ง: ฿{v.wholesalePrice.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="inline-flex items-center text-red-400 font-bold text-xs bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                            <ArrowDownRight className="w-3 h-3 mr-0.5" />
                            -฿{v.lossAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-white/10 text-[11px]">
                  <span className="text-zinc-400">
                    กรุณาปรับราคาเพื่อป้องกันการขายขาดทุน
                  </span>
                  {toast.violations && toast.violations[0]?.variantId && toast.onScrollToVariant && (
                    <button
                      type="button"
                      onClick={() => toast.onScrollToVariant!(toast.violations![0].variantId)}
                      className="text-xs font-bold text-red-400 hover:text-red-300 underline cursor-pointer shrink-0"
                    >
                      ไปยังจุดที่ผิดพลาด
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                className={`rounded-2xl border shadow-xl p-4 flex items-start gap-3 backdrop-blur-md ${
                  toast.type === 'error'
                    ? 'bg-zinc-900/95 text-white border-red-500/40'
                    : toast.type === 'success'
                    ? 'bg-zinc-900/95 text-white border-emerald-500/40'
                    : 'bg-zinc-900/95 text-white border-zinc-700'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400" />}
                  {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                  {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold">{toast.title}</h4>
                  {toast.message && <p className="text-xs text-zinc-300 mt-0.5">{toast.message}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => onDismiss(toast.id)}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
