import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Product } from '../types';
import { Cpu, Smartphone, Camera, Battery, Check, ZoomIn, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getColorHex, resolveProductImage } from '../lib/deviceImages';
import { motion, AnimatePresence } from 'motion/react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ProductCardProps {
  key?: string | number;
  product: Product;
  brandName: string;
  index?: number;
  isCompared?: boolean;
  onToggleCompare?: (product: Product) => void;
  compareDisabled?: boolean;
}

const brandBadges: Record<string, { bg: string; text: string; border: string }> = {
  'Apple': { bg: 'bg-black', text: 'text-white', border: 'border-black/10' },
  'iPhone': { bg: 'bg-black', text: 'text-white', border: 'border-black/10' },
  'Samsung': { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700/20' },
  'OPPO': { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700/20' },
  'vivo': { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-700/20' },
  'Xiaomi': { bg: 'bg-orange-600', text: 'text-white', border: 'border-orange-700/20' },
};

export default function ProductCard({
  product,
  brandName,
  index,
  isCompared = false,
  onToggleCompare,
  compareDisabled = false
}: ProductCardProps) {
  
  const imgRef = useRef<HTMLImageElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Load slightly before coming into view
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);

  const defaultVariant = product.variants[0];
  const defaultColor = defaultVariant?.colors[0];

  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariant?.id);
  const [selectedColorId, setSelectedColorId] = useState(defaultColor?.id);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);

  const selectedVariant = useMemo(() => 
    product.variants.find(v => v.id === selectedVariantId) || defaultVariant,
    [product, selectedVariantId, defaultVariant]
  );

  const selectedColor = useMemo(() => 
    selectedVariant?.colors.find(c => c.id === selectedColorId) || selectedVariant?.colors[0],
    [selectedVariant, selectedColorId]
  );

  if (!selectedVariant || !selectedColor) return null;

  const isOutOfStock = (selectedColor.stock ?? 0) <= 0;
  const brandStyle = brandBadges[brandName] || { bg: 'bg-gray-800', text: 'text-white', border: 'border-gray-700' };

  // Clean model name: do not prefix brandName since brand badge is already on top.
  // Also strip brand prefix if product.model already starts with brand name (e.g. "Apple iPhone 15" -> "iPhone 15")
  const cleanModelName = useMemo(() => {
    if (!product.model) return '';
    const bName = (brandName || '').trim();
    if (bName && product.model.toLowerCase().startsWith(bName.toLowerCase())) {
      const stripped = product.model.slice(bName.length).trim();
      return stripped || product.model;
    }
    return product.model;
  }, [product.model, brandName]);

  const isApple = useMemo(() => {
    const b = (brandName || '').toLowerCase();
    const m = (product.model || '').toLowerCase();
    return b.includes('apple') || b.includes('iphone') || m.includes('iphone') || m.includes('ipad');
  }, [brandName, product.model]);

  // Resolve authentic device image if not uploaded yet
  const currentImageUrl = resolveProductImage(
    brandName,
    product.model,
    selectedColor.colorName,
    selectedColor.imageUrl,
    product.category
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        y: -6,
        scale: 1.018,
        transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
      }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.3, delay: (index ?? 0) * 0.03 }}
      className="group bg-white rounded-xl shadow-xs border border-gray-200/90 hover:border-primary/40 overflow-hidden flex flex-col h-full hover:shadow-2xl hover:shadow-slate-300/60 transition-shadow duration-300 ease-out will-change-transform"
    >
      {/* Top Section: Image & Badges with smooth transition */}
      <div className="bg-[#f8f9fa] relative p-2.5 sm:p-3 flex flex-col items-center justify-center h-60 sm:h-72 md:h-80 overflow-hidden border-b border-gray-100/80">
        
        {/* Compare Checkbox Button */}
        {onToggleCompare && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!isCompared && compareDisabled) return;
              onToggleCompare(product);
            }}
            disabled={!isCompared && compareDisabled}
            className={cn(
              "absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer shadow-xs active:scale-95 select-none",
              isCompared
                ? "bg-red-600 text-white shadow-red-500/30 ring-2 ring-red-400/40"
                : compareDisabled
                ? "bg-white/80 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60"
                : "bg-white/90 hover:bg-white text-gray-700 hover:text-red-600 border border-gray-200/90 hover:border-red-200 backdrop-blur-xs"
            )}
            title={
              isCompared
                ? "ยกเลิกการเปรียบเทียบ"
                : compareDisabled
                ? "เลือกเปรียบเทียบได้สูงสุด 3 รุ่น"
                : "เลือกเพื่อเปรียบเทียบสเปก (สูงสุด 3 รุ่น)"
            }
            aria-label={`เปรียบเทียบ ${product.model}`}
          >
            <div className={cn(
              "w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors",
              isCompared ? "bg-white border-white text-red-600" : "border-gray-400 bg-white"
            )}>
              {isCompared && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </div>
            <span>เปรียบเทียบ</span>
          </button>
        )}

        {/* Brand Pill */}
        <div className={cn(
          "absolute top-2.5 right-2.5 z-10 text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-2xs tracking-wide",
          brandStyle.bg,
          brandStyle.text
        )}>
          {brandName}
        </div>

        {/* Device Image with Cross-fade / Smooth transition */}
        <div 
          onClick={() => setShowZoomModal(true)}
          className="relative w-full h-full flex items-center justify-center p-0.5 sm:p-1 cursor-zoom-in group/img"
          title="คลิกเพื่อดูรูปภาพขนาดใหญ่และชัดเจน"
        >
          <AnimatePresence mode="wait">
            {currentImageUrl !== null ? (
              <motion.img
                key={`${selectedColor.id}-${currentImageUrl}`}
                ref={imgRef}
                src={isVisible ? currentImageUrl : undefined}
                alt={`${product.model} - ${selectedColor.colorName}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onLoad={() => setImageLoaded(true)}
                className="max-h-full max-w-full w-auto h-auto object-contain filter drop-shadow-xl scale-110 sm:scale-115 group-hover:scale-125 transition-transform duration-300 ease-out select-none"
                loading="lazy" decoding="async"
              />
            ) : (
              <motion.div
                key={`no-img-${selectedColor.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center text-gray-400 w-full h-full opacity-60"
              >
                <Smartphone className="w-14 h-14 mb-2 stroke-[1.5]" />
                <span className="text-[10px] uppercase font-medium tracking-wider">No Image</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active Color Name Tag */}
        <div className="absolute bottom-2 left-2.5 z-10">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-white/95 backdrop-blur-xs text-gray-700 px-2 py-0.5 rounded-md border border-gray-200/70 shadow-2xs">
            <span 
              className="w-2 h-2 rounded-full border border-gray-300 shrink-0" 
              style={{ backgroundColor: getColorHex(selectedColor.colorName) }}
            />
            <span className="max-w-[110px] truncate">{selectedColor.colorName || 'สีเริ่มต้น'}</span>
          </span>
        </div>

        {/* Quick Zoom Hint Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowZoomModal(true);
          }}
          className="absolute bottom-2 right-2.5 z-10 flex items-center gap-1 text-[10px] font-bold bg-white/95 hover:bg-white text-zinc-700 hover:text-red-600 px-2 py-0.5 rounded-md border border-gray-200/80 shadow-2xs backdrop-blur-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="คลิกเพื่อขยายรูปภาพขนาดใหญ่"
        >
          <ZoomIn className="w-3 h-3 text-red-500" />
          <span className="text-[9px]">ขยาย</span>
        </button>
      </div>

      {/* Bottom Section: Product Information & Specs */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between select-none">
        <div>
          {/* Product Model Name */}
          <div className="mb-2.5">
            <h3 
              className="text-sm sm:text-base font-extrabold text-zinc-900 line-clamp-1 group-hover:text-red-600 transition-colors tracking-tight"
              title={cleanModelName}
            >
              {cleanModelName}
            </h3>
            {product.detail && (
              <span className="text-xs font-medium text-zinc-500 line-clamp-1 mt-0.5">{product.detail}</span>
            )}
          </div>

          {/* Specs List with compact micro-icons */}
          <div className="space-y-1.5 mb-3.5 text-xs text-zinc-600 bg-zinc-50/80 p-2.5 rounded-xl border border-zinc-100">
            {product.specs?.chipset && (
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate leading-tight font-medium">{product.specs.chipset}</span>
              </div>
            )}
            {product.specs?.screen && (
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate leading-tight font-medium">{product.specs.screen}</span>
              </div>
            )}
            {product.specs?.camera && (
              <div className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate leading-tight font-medium">{product.specs.camera}</span>
              </div>
            )}
            {product.specs?.battery && (
              <div className="flex items-center gap-1.5">
                <Battery className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="truncate leading-tight font-medium">{product.specs.battery}</span>
              </div>
            )}
          </div>

          {/* Storage / RAM Variant Selector */}
          <div className="mb-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                {isApple ? 'ความจุ (ROM):' : 'ความจุ:'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {product.variants.map((v) => {
                const isSelected = selectedVariantId === v.id;
                // For Apple products: strictly ROM only, never display RAM
                const label = isApple ? v.rom : (v.ram && v.ram.trim() ? `${v.ram}/${v.rom}` : v.rom);
                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVariantId(v.id);
                      setSelectedColorId(v.colors[0]?.id);
                    }}
                    className={cn(
                      "text-xs sm:text-sm px-3 py-1 rounded-full font-bold transition-all duration-150 cursor-pointer active:scale-90",
                      isSelected
                        ? "bg-zinc-900 text-white shadow-xs scale-[1.04]"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector Dots */}
          <div className="mb-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">เลือกสี:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedVariant.colors.map((color) => {
                const isSelected = selectedColorId === color.id;
                const hex = getColorHex(color.colorName);
                return (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColorId(color.id)}
                    className={cn(
                      "relative w-6 h-6 rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center active:scale-75",
                      isSelected
                        ? "ring-2 ring-zinc-900 ring-offset-2 scale-115 shadow-sm"
                        : "hover:scale-120 opacity-80 hover:opacity-100"
                    )}
                    style={{ backgroundColor: hex }}
                    title={color.colorName}
                  >
                    {/* Ring highlight */}
                    <span 
                      className={cn(
                        "w-full h-full rounded-full border border-black/15",
                        isSelected ? "border-transparent" : ""
                      )} 
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pricing & Stock Footer */}
        <div className="pt-2.5 border-t border-zinc-100 flex items-end justify-between mt-auto">
          <div>
            <div className="text-lg sm:text-xl leading-none font-black text-red-600 tracking-tight">
              {selectedVariant.retailPrice > 0 ? `${selectedVariant.retailPrice.toLocaleString()} ฿` : 'สอบถามราคา'}
            </div>
            <div className="text-[10px] text-zinc-400 font-medium mt-1">ราคาหน้าร้าน</div>
          </div>

          <div className="text-right">
            {isOutOfStock ? (
              <span className="inline-flex items-center text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-full border border-zinc-200">
                สินค้าหมด
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/70 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                มีสินค้าพร้อมส่ง
              </span>
            )}
          </div>
        </div>
      </div>

      {/* High-Resolution Zoom Lightbox Modal */}
      {showZoomModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setShowZoomModal(false);
          }}
        >
          <div
            className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl flex flex-col items-center border border-zinc-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowZoomModal(false)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer active:scale-95"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Details */}
            <div className="text-center mb-4 w-full pr-8">
              <span className="inline-block text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-1">
                {brandName}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                {cleanModelName}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                สี: <span className="font-semibold text-zinc-800">{selectedColor.colorName}</span>
                {' • '}
                ความจุ: <span className="font-semibold text-zinc-800">
                  {isApple ? selectedVariant.rom : (selectedVariant.ram ? `${selectedVariant.ram}/${selectedVariant.rom}` : selectedVariant.rom)}
                </span>
              </p>
            </div>

            {/* Extra Large Clear Device Image */}
            <div className="w-full h-80 sm:h-96 bg-zinc-50/90 rounded-2xl flex items-center justify-center p-6 border border-zinc-100 relative shadow-inner">
              {currentImageUrl ? (
                <img
                  src={currentImageUrl}
                  alt={`${cleanModelName} - ${selectedColor.colorName}`}
                  className="max-h-full max-w-full object-contain filter drop-shadow-2xl transition-transform duration-300 select-none scale-105 hover:scale-110"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-400">
                  <Smartphone className="w-16 h-16 mb-2 stroke-[1.5]" />
                  <span className="text-xs font-medium">ไม่มีรูปภาพ</span>
                </div>
              )}
            </div>

            {/* Color Selector Pills inside Zoom View */}
            {selectedVariant.colors.length > 1 && (
              <div className="mt-5 w-full">
                <div className="text-center text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wider">
                  เลือกดูสีอื่นๆ ของรุ่นนี้:
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {selectedVariant.colors.map((color) => {
                    const isSelected = color.id === selectedColor.id;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setSelectedColorId(color.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border",
                          isSelected
                            ? "bg-zinc-900 text-white border-zinc-900 shadow-sm ring-2 ring-zinc-900/20"
                            : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                        )}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: getColorHex(color.colorName) }}
                        />
                        <span>{color.colorName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </motion.div>
  );
}
