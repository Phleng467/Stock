import { useState, useMemo, useEffect, useRef } from 'react';
import { Product } from '../types';
import { Cpu, Smartphone, Camera, Battery, Check } from 'lucide-react';
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
      <div className="bg-[#f8f9fa] relative p-4 flex flex-col items-center justify-center h-48 sm:h-56 md:h-64 overflow-hidden border-b border-gray-100/80">
        


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
        <div className="relative w-full h-full flex items-center justify-center p-2">
          <AnimatePresence mode="wait">
            {currentImageUrl !== null ? (
              <motion.img
                key={`${selectedColor.id}-${currentImageUrl}`}
                ref={imgRef}
                src={isVisible ? currentImageUrl : undefined}
                alt={`${product.model} - ${selectedColor.colorName}`}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onLoad={() => setImageLoaded(true)}
                className="max-h-full max-w-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-500 ease-out select-none"
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
                <Smartphone className="w-12 h-12 mb-2 stroke-[1.5]" />
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
      </div>

      {/* Bottom Section: Product Information & Specs */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Product Model Name */}
          <div className="mb-2">
            <h3 
              className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors"
              title={`${brandName} ${product.model}`}
            >
              {brandName} {product.model}
            </h3>
            {product.detail && (
              <span className="text-[10px] font-medium text-gray-500 line-clamp-1">{product.detail}</span>
            )}
          </div>

          {/* Specs List with compact micro-icons */}
          <div className="space-y-1 mb-3 text-[10px] sm:text-[11px] text-gray-600 bg-gray-50/70 p-2 rounded-lg border border-gray-100">
            {product.specs?.chipset && (
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="truncate leading-tight">{product.specs.chipset}</span>
              </div>
            )}
            {product.specs?.screen && (
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="truncate leading-tight">{product.specs.screen}</span>
              </div>
            )}
            {product.specs?.camera && (
              <div className="flex items-center gap-1.5">
                <Camera className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="truncate leading-tight">{product.specs.camera}</span>
              </div>
            )}
            {product.specs?.battery && (
              <div className="flex items-center gap-1.5">
                <Battery className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="truncate leading-tight">{product.specs.battery}</span>
              </div>
            )}
          </div>

          {/* Storage / RAM Variant Selector */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">ความจุ:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {product.variants.map((v) => {
                const isSelected = selectedVariantId === v.id;
                const label = `${v.ram ? `${v.ram}/` : ''}${v.rom}`;
                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVariantId(v.id);
                      setSelectedColorId(v.colors[0]?.id);
                    }}
                    className={cn(
                      "text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full font-semibold transition-all duration-150 cursor-pointer active:scale-90",
                      isSelected
                        ? "bg-zinc-900 text-white shadow-xs scale-[1.04]"
                        : "bg-zinc-100/90 text-zinc-600 hover:bg-zinc-200/90 hover:text-zinc-900 hover:scale-[1.02]"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector Dots */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">เลือกสี:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedVariant.colors.map((color) => {
                const isSelected = selectedColorId === color.id;
                const hex = getColorHex(color.colorName);
                return (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColorId(color.id)}
                    className={cn(
                      "relative w-5 h-5 rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center active:scale-75",
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
    </motion.div>
  );
}
