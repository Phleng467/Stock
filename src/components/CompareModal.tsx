import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Smartphone, Tablet, Cpu, Camera, Battery, HardDrive, Layers, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { Product, Brand } from '../types';
import { resolveProductImage, getColorHex } from '../lib/deviceImages';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  brands: Brand[];
  onRemoveProduct: (productId: string) => void;
  onClearAll: () => void;
}

const brandBadges: Record<string, { bg: string; text: string }> = {
  'Apple': { bg: 'bg-black', text: 'text-white' },
  'iPhone': { bg: 'bg-black', text: 'text-white' },
  'Samsung': { bg: 'bg-blue-600', text: 'text-white' },
  'OPPO': { bg: 'bg-emerald-600', text: 'text-white' },
  'vivo': { bg: 'bg-indigo-600', text: 'text-white' },
  'Xiaomi': { bg: 'bg-orange-600', text: 'text-white' },
};

export default function CompareModal({
  isOpen,
  onClose,
  products,
  brands,
  onRemoveProduct,
  onClearAll,
}: CompareModalProps) {
  const brandMap = useMemo(() => {
    const map = new Map<string, string>();
    brands.forEach((b) => map.set(b.id, b.name));
    return map;
  }, [brands]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 select-none overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative z-10 w-full max-w-6xl max-h-[92vh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200/90"
        >
          {/* Header */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-200/80 bg-zinc-50/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-600/10 border border-red-600/20 text-red-600 flex items-center justify-center">
                <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 flex items-center gap-2">
                  <span>เปรียบเทียบสเปกสินค้า</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    {products.length}/3 รุ่น
                  </span>
                </h2>
                <p className="text-[11px] sm:text-xs text-zinc-500 hidden sm:block">
                  เปรียบเทียบคุณสมบัติ สเปก ราคา และสถานะสต็อคแบบเคียงข้างกัน (สูงสุด 3 รุ่น)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {products.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium text-zinc-600 hover:text-red-600 hover:bg-red-50 border border-zinc-200/80 hover:border-red-200 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                  title="ล้างการเปรียบเทียบทั้งหมด"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ล้างทั้งหมด</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-100 hover:bg-zinc-200/80 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                title="ปิดหน้าต่างเปรียบเทียบ"
                aria-label="Close"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Body Content: Side-by-Side Comparison */}
          {products.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center my-auto">
              <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-zinc-800">ยังไม่ได้เลือกรุ่นสำหรับเปรียบเทียบ</h3>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-sm">
                คลิกที่ปุ่ม <strong>"เปรียบเทียบ"</strong> บนการ์ดสินค้าหน้าร้านเพื่อเลือกรุ่นที่ต้องการเปรียบเทียบ (เลือกได้สูงสุด 3 รุ่น)
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-95"
              >
                กลับไปเลือกสินค้า
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 scrollbar-thin">
              <div className="min-w-[620px]">
                {/* Product Summary Header Cards */}
                <div className="grid grid-cols-4 gap-3 sm:gap-4 pb-4 border-b border-zinc-200">
                  {/* Left Label Column */}
                  <div className="col-span-1 flex flex-col justify-end pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">ข้อมูลสินค้า</span>
                    <span className="text-sm font-semibold text-zinc-700 mt-0.5">ภาพรวม & สต็อค</span>
                  </div>

                  {/* Product Cards */}
                  {products.map((product) => {
                    const brandName = brandMap.get(product.brandId) || 'Unknown';
                    const brandStyle = brandBadges[brandName] || { bg: 'bg-zinc-800', text: 'text-white' };
                    const firstVariant = product.variants[0];
                    const firstColor = firstVariant?.colors[0];
                    const imageUrl = resolveProductImage(
                      brandName,
                      product.model,
                      firstColor?.colorName || '',
                      firstColor?.imageUrl,
                      product.category
                    );

                    // Compute price range
                    const allPrices = product.variants.map((v) => v.retailPrice).filter(Boolean);
                    const minPrice = allPrices.length ? Math.min(...allPrices) : 0;
                    const maxPrice = allPrices.length ? Math.max(...allPrices) : 0;

                    // Compute total stock
                    const totalStock = product.variants.reduce((acc, v) => {
                      return acc + v.colors.reduce((cAcc, c) => cAcc + (c.stock || 0), 0);
                    }, 0);

                    return (
                      <div
                        key={product.id}
                        className="col-span-1 relative bg-zinc-50/80 rounded-2xl p-3 border border-zinc-200/80 flex flex-col justify-between group hover:border-red-200 hover:shadow-md transition-all"
                      >
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => onRemoveProduct(product.id)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 hover:bg-red-50 text-zinc-400 hover:text-red-600 border border-zinc-200/80 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-90 z-10"
                          title={`นำ ${product.model} ออกจากการเปรียบเทียบ`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex flex-col items-center text-center">
                          {/* Device Image */}
                          <div className="w-full h-32 sm:h-36 bg-white rounded-xl p-2 flex items-center justify-center border border-zinc-100 mb-2.5 overflow-hidden">
                            <img
                              src={imageUrl}
                              alt={product.model}
                              className="max-h-full max-w-full object-contain filter drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>

                          {/* Brand Pill */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${brandStyle.bg} ${brandStyle.text} mb-1`}>
                            {brandName}
                          </span>

                          {/* Model */}
                          <h4 className="text-xs sm:text-sm font-bold text-zinc-900 line-clamp-1" title={product.model}>
                            {product.model}
                          </h4>

                          {/* Price */}
                          <div className="mt-1">
                            <span className="text-xs sm:text-sm font-extrabold text-red-600">
                              {minPrice > 0 ? (
                                minPrice === maxPrice ? (
                                  `฿${minPrice.toLocaleString()}`
                                ) : (
                                  `฿${minPrice.toLocaleString()} - ฿${maxPrice.toLocaleString()}`
                                )
                              ) : (
                                'ไม่ระบุราคา'
                              )}
                            </span>
                          </div>

                          {/* Total Stock Badge */}
                          <div className="mt-1.5">
                            {totalStock > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>พร้อมขาย {totalStock} เครื่อง</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-full">
                                <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                <span>สินค้าหมด</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty Slot Card if less than 3 */}
                  {Array.from({ length: 3 - products.length }).map((_, idx) => (
                    <div
                      key={`empty-${idx}`}
                      onClick={onClose}
                      className="col-span-1 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-red-300 p-4 flex flex-col items-center justify-center text-center text-zinc-400 hover:text-zinc-600 bg-zinc-50/40 hover:bg-red-50/20 transition-all cursor-pointer min-h-[220px]"
                      title="ปิดหน้านี้แล้วเลือกสินค้าเพิ่ม"
                    >
                      <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 mb-2">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold">เลือกเพิ่มได้อีก {3 - products.length - idx} รุ่น</span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">คลิกเพื่อกลับไปเลือก</span>
                    </div>
                  ))}
                </div>

                {/* Specs Comparison Rows */}
                <div className="divide-y divide-zinc-100 text-xs sm:text-sm mt-2">
                  {/* Category */}
                  <div className="grid grid-cols-4 py-3 hover:bg-zinc-50/60 px-2 rounded-lg transition-colors">
                    <div className="col-span-1 font-semibold text-zinc-500 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                      <span>ประเภทอุปกรณ์</span>
                    </div>
                    {products.map((p) => (
                      <div key={p.id} className="col-span-1 text-zinc-800 font-medium px-2">
                        {p.category === 'Mobile' ? 'สมาร์ทโฟน (Smartphone)' : 'แท็บเล็ต (Tablet)'}
                      </div>
                    ))}
                    {Array.from({ length: 3 - products.length }).map((_, i) => (
                      <div key={i} className="col-span-1 text-zinc-300 px-2">-</div>
                    ))}
                  </div>

                  {/* Highlights / Network */}
                  <div className="grid grid-cols-4 py-3 hover:bg-zinc-50/60 px-2 rounded-lg transition-colors">
                    <div className="col-span-1 font-semibold text-zinc-500 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-zinc-400" />
                      <span>จุดเด่น / การเชื่อมต่อ</span>
                    </div>
                    {products.map((p) => (
                      <div key={p.id} className="col-span-1 text-zinc-800 px-2">
                        {p.detail || '-'}
                      </div>
                    ))}
                    {Array.from({ length: 3 - products.length }).map((_, i) => (
                      <div key={i} className="col-span-1 text-zinc-300 px-2">-</div>
                    ))}
                  </div>

                  {/* RAM & Storage Options */}
                  <div className="grid grid-cols-4 py-3 hover:bg-zinc-50/60 px-2 rounded-lg transition-colors">
                    <div className="col-span-1 font-semibold text-zinc-500 flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
                      <span>ความจุ & แรม (RAM / ROM)</span>
                    </div>
                    {products.map((p) => (
                      <div key={p.id} className="col-span-1 text-zinc-800 px-2 space-y-1">
                        {p.variants.map((v) => (
                          <div key={v.id} className="inline-flex items-center gap-1 mr-1 mb-1 px-2 py-0.5 rounded-md bg-zinc-100 text-[11px] font-semibold text-zinc-700">
                            <span>{v.ram && v.ram !== '-' ? `${v.ram} + ` : ''}{v.rom}</span>
                            <span className="text-zinc-400 font-normal">({v.retailPrice ? `฿${v.retailPrice.toLocaleString()}` : 'ตามราคาตลาด'})</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    {Array.from({ length: 3 - products.length }).map((_, i) => (
                      <div key={i} className="col-span-1 text-zinc-300 px-2">-</div>
                    ))}
                  </div>

                  {/* Screen / Display */}
                  <div className="grid grid-cols-4 py-3 hover:bg-zinc-50/60 px-2 rounded-lg transition-colors">
                    <div className="col-span-1 font-semibold text-zinc-500 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                      <span>หน้าจอแสดงผล</span>
                    </div>
                    {products.map((p) => (
                      <div key={p.id} className="col-span-1 text-zinc-800 font-medium px-2">
                        {p.specs?.screen || p.specs?.display || '-'}
                      </div>
                    ))}
                    {Array.from({ length: 3 - products.length }).map((_, i) => (
                      <div key={i} className="col-span-1 text-zinc-300 px-2">-</div>
                    ))}
                  </div>

                  {/* Processor / Chipset */}
                  <div className="grid grid-cols-4 py-3 hover:bg-zinc-50/60 px-2 rounded-lg transition-colors">
                    <div className="col-span-1 font-semibold text-zinc-500 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                      <span>ชิปประมวลผล (Processor)</span>
                    </div>
                    {products.map((p) => (
                      <div key={p.id} className="col-span-1 text-zinc-800 font-medium px-2">
                        {p.specs?.chipset || p.specs?.cpu || '-'}
                      </div>
                    ))}
                    {Array.from({ length: 3 - products.length }).map((_, i) => (
                      <div key={i} className="col-span-1 text-zinc-300 px-2">-</div>
                    ))}
                  </div>

                  {/* Camera */}
                  <div className="grid grid-cols-4 py-3 hover:bg-zinc-50/60 px-2 rounded-lg transition-colors">
                    <div className="col-span-1 font-semibold text-zinc-500 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-zinc-400" />
                      <span>กล้องถ่ายรูป (Camera)</span>
                    </div>
                    {products.map((p) => (
                      <div key={p.id} className="col-span-1 text-zinc-800 font-medium px-2">
                        {p.specs?.camera || '-'}
                      </div>
                    ))}
                    {Array.from({ length: 3 - products.length }).map((_, i) => (
                      <div key={i} className="col-span-1 text-zinc-300 px-2">-</div>
                    ))}
                  </div>

                  {/* Battery */}
                  <div className="grid grid-cols-4 py-3 hover:bg-zinc-50/60 px-2 rounded-lg transition-colors">
                    <div className="col-span-1 font-semibold text-zinc-500 flex items-center gap-1.5">
                      <Battery className="w-3.5 h-3.5 text-zinc-400" />
                      <span>แบตเตอรี่ & ชาร์จ</span>
                    </div>
                    {products.map((p) => (
                      <div key={p.id} className="col-span-1 text-zinc-800 font-medium px-2">
                        {p.specs?.battery || '-'}
                      </div>
                    ))}
                    {Array.from({ length: 3 - products.length }).map((_, i) => (
                      <div key={i} className="col-span-1 text-zinc-300 px-2">-</div>
                    ))}
                  </div>

                  {/* Operating System */}
                  <div className="grid grid-cols-4 py-3 hover:bg-zinc-50/60 px-2 rounded-lg transition-colors">
                    <div className="col-span-1 font-semibold text-zinc-500 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-zinc-400" />
                      <span>ระบบปฏิบัติการ (OS)</span>
                    </div>
                    {products.map((p) => (
                      <div key={p.id} className="col-span-1 text-zinc-800 font-medium px-2">
                        {p.specs?.os || '-'}
                      </div>
                    ))}
                    {Array.from({ length: 3 - products.length }).map((_, i) => (
                      <div key={i} className="col-span-1 text-zinc-300 px-2">-</div>
                    ))}
                  </div>

                  {/* Weight */}
                  <div className="grid grid-cols-4 py-3 hover:bg-zinc-50/60 px-2 rounded-lg transition-colors">
                    <div className="col-span-1 font-semibold text-zinc-500 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                      <span>น้ำหนักตัวเครื่อง</span>
                    </div>
                    {products.map((p) => (
                      <div key={p.id} className="col-span-1 text-zinc-800 font-medium px-2">
                        {p.specs?.weight || '-'}
                      </div>
                    ))}
                    {Array.from({ length: 3 - products.length }).map((_, i) => (
                      <div key={i} className="col-span-1 text-zinc-300 px-2">-</div>
                    ))}
                  </div>

                  {/* Colors & In-stock */}
                  <div className="grid grid-cols-4 py-3 hover:bg-zinc-50/60 px-2 rounded-lg transition-colors">
                    <div className="col-span-1 font-semibold text-zinc-500 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-zinc-400" />
                      <span>สีและสต็อคคงเหลือ</span>
                    </div>
                    {products.map((p) => {
                      // Aggregate all colors across variants
                      const colorMap = new Map<string, { colorName: string; stock: number }>();
                      p.variants.forEach((v) => {
                        v.colors.forEach((c) => {
                          const existing = colorMap.get(c.colorName);
                          if (existing) {
                            existing.stock += c.stock || 0;
                          } else {
                            colorMap.set(c.colorName, { colorName: c.colorName, stock: c.stock || 0 });
                          }
                        });
                      });

                      const colorList = Array.from(colorMap.values());

                      return (
                        <div key={p.id} className="col-span-1 text-zinc-800 px-2 space-y-1.5">
                          {colorList.map((col) => (
                            <div key={col.colorName} className="flex items-center justify-between text-[11px] bg-white border border-zinc-200/80 rounded-lg px-2 py-1">
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-zinc-300 shrink-0"
                                  style={{ backgroundColor: getColorHex(col.colorName) }}
                                />
                                <span className="font-medium text-zinc-700">{col.colorName}</span>
                              </span>
                              <span className={col.stock > 0 ? 'text-emerald-600 font-bold' : 'text-zinc-400'}>
                                {col.stock > 0 ? `${col.stock} เครื่อง` : 'หมด'}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {Array.from({ length: 3 - products.length }).map((_, i) => (
                      <div key={i} className="col-span-1 text-zinc-300 px-2">-</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 border-t border-zinc-200/80 bg-zinc-50/80 flex items-center justify-between shrink-0 text-xs text-zinc-500">
            <span>* ข้อมูลสเปกและราคาอาจมีการเปลี่ยนแปลงตามโปรโมชั่นหน้าร้าน</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold transition-colors cursor-pointer active:scale-95"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
