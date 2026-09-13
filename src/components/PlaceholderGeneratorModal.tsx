import { useState, useRef, useEffect, useMemo } from 'react';
import { Sparkles, Palette, Smartphone, Tablet, Check, X, Download, Sliders, RefreshCw, Layers } from 'lucide-react';
import { cn } from './ProductCard';
import { getColorHex } from '../lib/deviceImages';

interface PlaceholderGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageDataUrl: string) => Promise<void> | void;
  initialBrand?: string;
  initialModel?: string;
  initialColorName?: string;
  initialColorHex?: string;
  initialStorage?: string;
  initialCategory?: 'Mobile' | 'Tablet';
}

type ThemeStyle = 'studio' | 'gradient' | 'card' | 'dark';
type DeviceStyle = 'phone' | 'tablet' | 'box';

export default function PlaceholderGeneratorModal({
  isOpen,
  onClose,
  onSelectImage,
  initialBrand = 'Samsung',
  initialModel = 'Galaxy S24',
  initialColorName = 'Black',
  initialColorHex,
  initialStorage = '256GB',
  initialCategory = 'Mobile',
}: PlaceholderGeneratorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [brand, setBrand] = useState(initialBrand);
  const [model, setModel] = useState(initialModel);
  const [colorName, setColorName] = useState(initialColorName);
  const [colorHex, setColorHex] = useState(initialColorHex || getColorHex(initialColorName));
  const [storage, setStorage] = useState(initialStorage);
  const [category, setCategory] = useState<'Mobile' | 'Tablet'>(initialCategory);

  const [themeStyle, setThemeStyle] = useState<ThemeStyle>('studio');
  const [deviceStyle, setDeviceStyle] = useState<DeviceStyle>(initialCategory === 'Tablet' ? 'tablet' : 'phone');
  const [showWatermark, setShowWatermark] = useState(true);
  const [showSpecs, setShowSpecs] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      setBrand(initialBrand || 'Jaymart');
      setModel(initialModel || 'สมาร์ทโฟน');
      setColorName(initialColorName || 'Standard');
      setColorHex(initialColorHex || getColorHex(initialColorName || ''));
      setStorage(initialStorage || '');
      setCategory(initialCategory);
      setDeviceStyle(initialCategory === 'Tablet' ? 'tablet' : 'phone');
    }
  }, [isOpen, initialBrand, initialModel, initialColorName, initialColorHex, initialStorage, initialCategory]);

  // Redraw canvas whenever options change
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 800;
    canvas.width = size;
    canvas.height = size;

    // 1. Draw Background
    if (themeStyle === 'studio') {
      // Soft modern studio clean
      const bgGrad = ctx.createRadialGradient(size / 2, size / 2, 50, size / 2, size / 2, 450);
      bgGrad.addColorStop(0, '#ffffff');
      bgGrad.addColorStop(0.7, '#f8fafc');
      bgGrad.addColorStop(1, '#f1f5f9');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, size, size);

      // Subtle ambient circle tint
      const tintGrad = ctx.createRadialGradient(size / 2, size * 0.45, 20, size / 2, size * 0.45, 260);
      tintGrad.addColorStop(0, `${colorHex}18`);
      tintGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = tintGrad;
      ctx.fillRect(0, 0, size, size);

    } else if (themeStyle === 'gradient') {
      // Elegant color-tinted luxury gradient
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#f8fafc');
      grad.addColorStop(0.5, `${colorHex}22`);
      grad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

    } else if (themeStyle === 'dark') {
      // Premium Matte Dark
      const darkGrad = ctx.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, 500);
      darkGrad.addColorStop(0, '#1e293b');
      darkGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = darkGrad;
      ctx.fillRect(0, 0, size, size);

      // Glow accent
      const glowGrad = ctx.createRadialGradient(size / 2, size * 0.45, 10, size / 2, size * 0.45, 250);
      glowGrad.addColorStop(0, `${colorHex}44`);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, size, size);

    } else {
      // Card / Inventory Style
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Outer border frame
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 16;
      ctx.strokeRect(20, 20, size - 40, size - 40);

      // Top header banner
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(28, 28, size - 56, 110);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(28, 138);
      ctx.lineTo(size - 28, 138);
      ctx.stroke();
    }

    // 2. Draw Device Silhouette in Center
    ctx.save();
    const centerX = size / 2;
    const centerY = size * 0.44;

    // Shadow underneath device
    ctx.shadowColor = 'rgba(15, 23, 42, 0.15)';
    ctx.shadowBlur = 35;
    ctx.shadowOffsetY = 20;

    if (deviceStyle === 'phone') {
      // Smartphone Vertical Silhouette
      const dw = 200;
      const dh = 390;
      const dr = 32;

      // Body Outline / Bezel
      ctx.fillStyle = themeStyle === 'dark' ? '#334155' : '#1e293b';
      drawRoundedRect(ctx, centerX - dw / 2, centerY - dh / 2, dw, dh, dr);
      ctx.fill();

      // Screen glass / inner frame
      ctx.shadowColor = 'transparent';
      const sw = dw - 14;
      const sh = dh - 14;
      const screenGrad = ctx.createLinearGradient(centerX, centerY - sh / 2, centerX, centerY + sh / 2);
      screenGrad.addColorStop(0, colorHex);
      screenGrad.addColorStop(0.5, '#ffffff');
      screenGrad.addColorStop(1, colorHex);

      ctx.fillStyle = screenGrad;
      drawRoundedRect(ctx, centerX - sw / 2, centerY - sh / 2, sw, sh, dr - 6);
      ctx.fill();

      // Camera Island (Top Left or Top Center pill)
      ctx.fillStyle = themeStyle === 'dark' ? '#0f172a' : '#0f172a';
      drawRoundedRect(ctx, centerX - 25, centerY - sh / 2 + 10, 50, 14, 7);
      ctx.fill();

      // Rear Camera Lens circles representation
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 40, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colorHex;
      ctx.beginPath();
      ctx.arc(centerX, centerY - 40, 30, 0, Math.PI * 2);
      ctx.fill();

      // Inner lens glass
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 40, 18, 0, Math.PI * 2);
      ctx.fill();

    } else if (deviceStyle === 'tablet') {
      // Tablet Silhouette
      const dw = 380;
      const dh = 270;
      const dr = 24;

      ctx.fillStyle = themeStyle === 'dark' ? '#334155' : '#1e293b';
      drawRoundedRect(ctx, centerX - dw / 2, centerY - dh / 2, dw, dh, dr);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      const sw = dw - 16;
      const sh = dh - 16;
      const screenGrad = ctx.createLinearGradient(centerX - sw / 2, centerY, centerX + sw / 2, centerY);
      screenGrad.addColorStop(0, colorHex);
      screenGrad.addColorStop(0.5, '#ffffff');
      screenGrad.addColorStop(1, colorHex);

      ctx.fillStyle = screenGrad;
      drawRoundedRect(ctx, centerX - sw / 2, centerY - sh / 2, sw, sh, dr - 6);
      ctx.fill();

      // Front Camera Dot
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(centerX, centerY - sh / 2 + 8, 4, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Retail Package Box Silhouette
      const dw = 250;
      const dh = 350;
      const dr = 16;

      ctx.fillStyle = themeStyle === 'dark' ? '#1e293b' : '#f8fafc';
      ctx.strokeStyle = themeStyle === 'dark' ? '#475569' : '#cbd5e1';
      ctx.lineWidth = 4;
      drawRoundedRect(ctx, centerX - dw / 2, centerY - dh / 2, dw, dh, dr);
      ctx.fill();
      ctx.stroke();

      // Brand on Box
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = themeStyle === 'dark' ? '#f8fafc' : '#0f172a';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(brand.toUpperCase(), centerX, centerY - 60);

      // Model on Box
      ctx.fillStyle = colorHex;
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText(model, centerX, centerY - 15);

      // Color Badge on Box
      ctx.beginPath();
      ctx.arc(centerX, centerY + 50, 24, 0, Math.PI * 2);
      ctx.fillStyle = colorHex;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();

    // 3. Draw Typography & Badges
    const isDarkText = themeStyle === 'dark';

    // Brand Label
    ctx.textAlign = 'center';
    ctx.fillStyle = isDarkText ? '#94a3b8' : '#64748b';
    ctx.font = '700 20px system-ui, -apple-system, sans-serif';
    ctx.fillText(brand.toUpperCase(), centerX, size * 0.73);

    // Model Name
    ctx.fillStyle = isDarkText ? '#ffffff' : '#0f172a';
    ctx.font = '900 36px system-ui, -apple-system, sans-serif';
    
    // Auto truncate model text if too wide
    let displayModel = model;
    if (ctx.measureText(displayModel).width > 700) {
      ctx.font = '900 28px system-ui, -apple-system, sans-serif';
    }
    ctx.fillText(displayModel, centerX, size * 0.79);

    // Color Swatch Pill & Specs
    const pillY = size * 0.85;
    const colorLabel = colorName || 'Standard';
    const specLabel = storage ? `${storage}` : '';
    const fullTag = specLabel ? `${colorLabel} • ${specLabel}` : colorLabel;

    ctx.font = '600 18px system-ui, -apple-system, sans-serif';
    const textWidth = ctx.measureText(fullTag).width;
    const pillWidth = textWidth + 60;
    const pillHeight = 38;

    // Pill Background
    ctx.fillStyle = isDarkText ? '#1e293b' : '#ffffff';
    ctx.strokeStyle = isDarkText ? '#334155' : '#e2e8f0';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, centerX - pillWidth / 2, pillY - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
    ctx.fill();
    ctx.stroke();

    // Color Swatch Dot inside pill
    ctx.beginPath();
    ctx.arc(centerX - pillWidth / 2 + 20, pillY, 9, 0, Math.PI * 2);
    ctx.fillStyle = colorHex;
    ctx.fill();
    ctx.strokeStyle = isDarkText ? '#334155' : '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pill text
    ctx.fillStyle = isDarkText ? '#e2e8f0' : '#334155';
    ctx.textAlign = 'left';
    ctx.fillText(fullTag, centerX - pillWidth / 2 + 38, pillY + 6);

    // 4. Store Watermark at Bottom
    if (showWatermark) {
      ctx.textAlign = 'center';
      ctx.fillStyle = isDarkText ? '#64748b' : '#94a3b8';
      ctx.font = '600 14px system-ui, -apple-system, sans-serif';
      ctx.fillText('JAYMART • ROBINSON SURIN 2ND FLOOR', centerX, size * 0.94);
    }

  }, [isOpen, brand, model, colorName, colorHex, storage, category, themeStyle, deviceStyle, showWatermark, showSpecs]);

  // Helper to draw rounded rectangle on canvas
  function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // Handle Apply
  const handleApply = async () => {
    if (!canvasRef.current) return;
    setIsApplying(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png', 0.95);
      await onSelectImage(dataUrl);
      onClose();
    } catch (err) {
      console.error('Failed to apply placeholder image:', err);
    } finally {
      setIsApplying(false);
    }
  };

  // Download local PNG
  const handleDownload = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `placeholder_${brand}_${model}_${colorName}.png`.replace(/\s+/g, '_');
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5">
      <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] animate-in fade-in duration-200 border border-zinc-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">สร้างภาพ Placeholder ประจำรุ่น</h3>
              <p className="text-xs text-zinc-500">สร้างภาพกราฟิกมาตรฐานความละเอียดสูง พร้อมสเปกและโลโก้ Jaymart สุรินทร์</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-200/80 hover:bg-zinc-300 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Canvas Preview + Controls */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Preview Area (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-3">
            <div className="w-full aspect-square max-w-[340px] sm:max-w-[380px] bg-zinc-100 rounded-2xl overflow-hidden shadow-md border border-zinc-300 relative group flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white">
                800 × 800 HD
              </div>
            </div>

            <div className="flex items-center gap-2 w-full max-w-[340px] sm:max-w-[380px]">
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl border border-zinc-200 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-zinc-500" />
                ดาวน์โหลด PNG
              </button>
            </div>
          </div>

          {/* Right / Controls Area (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Theme Style Selection */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                1. รูปแบบธีมกราฟิก (Theme Style)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'studio', label: 'Studio Clean', desc: 'ขาวสตูดิโอ' },
                  { id: 'gradient', label: 'Color Tint', desc: 'เฉดสีเครื่อง' },
                  { id: 'dark', label: 'Matte Dark', desc: 'ดำพรีเมียม' },
                  { id: 'card', label: 'Retail Card', desc: 'การ์ดหน้าร้าน' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setThemeStyle(t.id as ThemeStyle)}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                      themeStyle === t.id
                        ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20"
                        : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100/80 text-zinc-700"
                    )}
                  >
                    <div className="text-xs font-bold text-zinc-900">{t.label}</div>
                    <div className="text-[10px] text-zinc-500">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Device Silhouette Style */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                2. ทรงอุปกรณ์ (Device Silhouette)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeviceStyle('phone')}
                  className={cn(
                    "flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                    deviceStyle === 'phone'
                      ? "border-blue-600 bg-blue-50 text-blue-800"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  )}
                >
                  <Smartphone className="w-4 h-4" />
                  สมาร์ทโฟน
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceStyle('tablet')}
                  className={cn(
                    "flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                    deviceStyle === 'tablet'
                      ? "border-blue-600 bg-blue-50 text-blue-800"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  )}
                >
                  <Tablet className="w-4 h-4" />
                  แท็บเล็ต
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceStyle('box')}
                  className={cn(
                    "flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                    deviceStyle === 'box'
                      ? "border-blue-600 bg-blue-50 text-blue-800"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  )}
                >
                  <Layers className="w-4 h-4" />
                  กล่องเครื่อง
                </button>
              </div>
            </div>

            {/* Form Fields: Model, Brand, Color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 uppercase mb-1">แบรนด์</label>
                <input
                  type="text"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  className="w-full text-xs font-medium border border-zinc-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 uppercase mb-1">ชื่อรุ่น (Model)</label>
                <input
                  type="text"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full text-xs font-medium border border-zinc-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 uppercase mb-1">ชื่อสี</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={colorName}
                    onChange={e => {
                      setColorName(e.target.value);
                      setColorHex(getColorHex(e.target.value));
                    }}
                    className="flex-1 text-xs font-medium border border-zinc-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
                  />
                  <input
                    type="color"
                    value={colorHex}
                    onChange={e => setColorHex(e.target.value)}
                    className="w-9 h-9 p-0.5 border border-zinc-300 rounded-lg cursor-pointer shrink-0"
                    title="เลือกเฉดสี"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 uppercase mb-1">สเปกความจุ (RAM/ROM)</label>
                <input
                  type="text"
                  placeholder="เช่น 8/256GB"
                  value={storage}
                  onChange={e => setStorage(e.target.value)}
                  className="w-full text-xs font-medium border border-zinc-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* Quick Color Swatches */}
            <div>
              <span className="block text-[11px] font-semibold text-zinc-500 mb-1.5">เฉดสียอดนิยม:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { name: 'Black', hex: '#1e293b' },
                  { name: 'Silver/White', hex: '#f1f5f9' },
                  { name: 'Titanium Gray', hex: '#71717a' },
                  { name: 'Natural Gold', hex: '#d4af37' },
                  { name: 'Deep Blue', hex: '#1e3a8a' },
                  { name: 'Emerald Green', hex: '#065f46' },
                  { name: 'Pastel Purple', hex: '#8b5cf6' },
                  { name: 'Coral Pink', hex: '#f43f5e' }
                ].map((swatch, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setColorName(swatch.name);
                      setColorHex(swatch.hex);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 text-[11px] text-zinc-700 cursor-pointer shadow-2xs"
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-black/20" style={{ backgroundColor: swatch.hex }} />
                    <span>{swatch.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="pt-2 border-t border-zinc-200 flex flex-wrap gap-4 text-xs font-medium text-zinc-700">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showWatermark}
                  onChange={e => setShowWatermark(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>แสดงเครดิต &quot;Jaymart • Robinson Surin 2nd Floor&quot;</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-zinc-300 text-xs font-semibold text-zinc-700 rounded-xl hover:bg-white transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          
          <button
            type="button"
            disabled={isApplying}
            onClick={handleApply}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {isApplying ? 'กำลังบันทึก...' : 'ใช้รูป Placeholder นี้'}
          </button>
        </div>
      </div>
    </div>
  );
}
