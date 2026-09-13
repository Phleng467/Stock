import { useState, useEffect, useRef, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PromotionModal({
  isOpen,
  onClose
}: PromotionModalProps) {
  const [images, setImages] = useState<string[]>([
    '/promotions/promo_1.jpg',
    '/promotions/promo_2.png'
  ]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [dontShowToday, setDontShowToday] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch promotions list from server
  useEffect(() => {
    fetch('/api/promotions')
      .then(res => res.json())
      .then(data => {
        if (data.images && Array.isArray(data.images) && data.images.length > 0) {
          setImages(data.images);
        }
      })
      .catch(() => {
        // Use default images
      });
  }, []);

  // Continuous auto-slide timer when modal is open and multiple images exist
  useEffect(() => {
    if (!isOpen || images.length <= 1) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % images.length);
    }, 3500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, images.length]);

  const handleClose = () => {
    if (dontShowToday) {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem('hide_jaymart_promo_' + today, 'true');
    }
    onClose();
  };

  const handleDismissTodayDirectly = () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('hide_jaymart_promo_' + today, 'true');
    onClose();
  };

  const handleNext = (e: MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx(prev => (prev + 1) % images.length);
  };

  const handlePrev = (e: MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx(prev => (prev - 1 + images.length) % images.length);
  };

  const currentImage = images[currentIdx] || images[0] || '/promotions/promo_1.jpg';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Floating Image Wrapper (ตีกรอบแค่ตามภาพพอ ลอยๆ) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative z-10 flex flex-col items-center max-w-[92vw] sm:max-w-[420px] max-h-[90vh]"
          >
            {/* Top-Right Floating Dismiss Button */}
            <button
              onClick={handleClose}
              className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900/95 hover:bg-red-600 text-white border border-white/20 shadow-2xl flex items-center justify-center transition-all cursor-pointer active:scale-90 z-30 group"
              title="ปิดหน้าต่างโปรโมชั่น"
              aria-label="Close"
            >
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
            </button>

            {/* Prev / Next arrows outside the image (like the close button) */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute -left-3.5 sm:-left-12 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-zinc-900/95 hover:bg-red-600 text-white border border-white/20 shadow-2xl flex items-center justify-center transition-all cursor-pointer active:scale-90 z-30"
                  aria-label="ภาพก่อนหน้า"
                  title="ภาพก่อนหน้า"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute -right-3.5 sm:-right-12 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-zinc-900/95 hover:bg-red-600 text-white border border-white/20 shadow-2xl flex items-center justify-center transition-all cursor-pointer active:scale-90 z-30"
                  aria-label="ภาพถัดไป"
                  title="ภาพถัดไป"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </>
            )}

            {/* Poster Image Card (ขนาดพอดีกับรูปภาพ สะอาดตา ไม่มีปุ่มทับในรูป) */}
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-black/90 border border-white/15 bg-zinc-950 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImage}
                  src={currentImage}
                  alt={`Promotion ${currentIdx + 1}`}
                  initial={{ opacity: 0.75, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0.75, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="w-auto h-auto max-h-[66vh] sm:max-h-[72vh] object-contain block"
                  draggable={false}
                />
              </AnimatePresence>
            </div>

            {/* Slide Indicator Dots - อยู่ด้านล่างนอกรูปภาพ ไม่รกในรูป */}
            {images.length > 1 && (
              <div className="flex items-center gap-1.5 mt-2.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-white/15 backdrop-blur-sm z-20 shadow-lg">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIdx(i);
                    }}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      currentIdx === i ? 'bg-red-500 w-5' : 'bg-white/40 w-1.5 hover:bg-white/70'
                    }`}
                    aria-label={`รูปโปรโมชั่นที่ ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Floating Bottom Bar: ไม่ต้องแสดงวันนี้ & กดปิด */}
            <div className="mt-2.5 flex items-center justify-center gap-2 sm:gap-3 px-3.5 py-2 rounded-full bg-zinc-900/90 hover:bg-zinc-900 border border-white/15 text-xs text-zinc-300 backdrop-blur-md shadow-xl transition-all">
              <label className="flex items-center gap-2 cursor-pointer text-[11px] sm:text-xs text-zinc-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={dontShowToday}
                  onChange={(e) => setDontShowToday(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-red-600 bg-zinc-800 border-zinc-700 focus:ring-0 cursor-pointer"
                />
                <span>ไม่ต้องแสดงอีกวันนี้</span>
              </label>

              <span className="w-px h-3.5 bg-zinc-700" />

              <button
                onClick={handleClose}
                className="text-[11px] sm:text-xs font-semibold text-zinc-300 hover:text-white hover:underline cursor-pointer active:scale-95"
              >
                ปิด
              </button>

              <button
                onClick={handleDismissTodayDirectly}
                className="hidden sm:inline-block text-[10px] text-zinc-400 hover:text-red-400 cursor-pointer ml-1"
                title="ปิดและไม่ต้องแสดงอีกสำหรับวันนี้"
              >
                (ปิดวันนี้)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
