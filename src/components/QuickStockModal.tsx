import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { api } from '../lib/api';
import { X, Check, Loader2, Package, Hash, AlertCircle, Plus, Minus } from 'lucide-react';
import { getColorHex } from '../lib/deviceImages';
import { motion, AnimatePresence } from 'motion/react';

interface QuickStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  brandName?: string;
  onSuccess?: (updatedProduct: Product) => void;
}

export default function QuickStockModal({
  isOpen,
  onClose,
  product,
  brandName,
  onSuccess
}: QuickStockModalProps) {
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state when product changes
  useEffect(() => {
    if (product) {
      // Deep clone product so user edits don't mutate parent until saved
      setCurrentProduct(JSON.parse(JSON.stringify(product)));
      setErrorMsg(null);
      setSaveSuccess(false);
    } else {
      setCurrentProduct(null);
    }
  }, [product, isOpen]);

  if (!isOpen || !currentProduct) return null;

  const handleStockChange = (variantIndex: number, colorIndex: number, newStock: number) => {
    const val = Math.max(0, Math.floor(isNaN(newStock) ? 0 : newStock));
    setCurrentProduct(prev => {
      if (!prev) return null;
      const updated = { ...prev };
      updated.variants = [...updated.variants];
      updated.variants[variantIndex] = { ...updated.variants[variantIndex] };
      updated.variants[variantIndex].colors = [...updated.variants[variantIndex].colors];
      updated.variants[variantIndex].colors[colorIndex] = {
        ...updated.variants[variantIndex].colors[colorIndex],
        stock: val
      };
      return updated;
    });
  };

  const handleStockStep = (variantIndex: number, colorIndex: number, delta: number) => {
    if (!currentProduct) return;
    const currentStock = currentProduct.variants[variantIndex].colors[colorIndex].stock || 0;
    handleStockChange(variantIndex, colorIndex, currentStock + delta);
  };

  const handleSkuChange = (variantIndex: number, colorIndex: number, newSku: string) => {
    setCurrentProduct(prev => {
      if (!prev) return null;
      const updated = { ...prev };
      updated.variants = [...updated.variants];
      updated.variants[variantIndex] = { ...updated.variants[variantIndex] };
      updated.variants[variantIndex].colors = [...updated.variants[variantIndex].colors];
      updated.variants[variantIndex].colors[colorIndex] = {
        ...updated.variants[variantIndex].colors[colorIndex],
        sku: newSku
      };
      return updated;
    });
  };

  const calculateTotalStock = () => {
    if (!currentProduct) return 0;
    return currentProduct.variants.reduce((acc, v) => 
      acc + v.colors.reduce((cAcc, c) => cAcc + (c.stock || 0), 0), 0
    );
  };

  const handleSave = async () => {
    if (!currentProduct) return;
    try {
      setSaving(true);
      setErrorMsg(null);
      await api.saveProduct(currentProduct);
      setSaveSuccess(true);
      if (onSuccess) {
        onSuccess(currentProduct);
      }
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Failed to update stock:', err);
      setErrorMsg(err.message || 'บันทึกสต็อคล้มเหลว กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  const totalStock = calculateTotalStock();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200/60">
                  {brandName || 'Product'}
                </span>
                <span className="text-xs text-zinc-400">
                  {currentProduct.category === 'Mobile' ? 'มือถือ' : 'แท็บเล็ต'}
                </span>
              </div>
              <h2 className="text-base font-black text-zinc-900 truncate mt-0.5" title={currentProduct.model}>
                {currentProduct.model}
              </h2>
            </div>
          </div>

          <button
            type="button"
            id="close-quick-stock-btn"
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            title="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Total Stock Bar */}
        <div className="bg-zinc-900 text-white px-5 py-2.5 flex items-center justify-between text-xs">
          <span className="text-zinc-300 font-medium">สต็อครวมทุกรุ่น/สี:</span>
          <span className="font-mono font-bold text-sm bg-white/20 px-2.5 py-0.5 rounded-full">
            {totalStock} เครื่อง
          </span>
        </div>

        {/* Scrollable Variants & Colors list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {currentProduct.variants.map((v, vIndex) => (
            <div 
              key={v.id || vIndex}
              className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-2xs"
            >
              {/* Variant Header */}
              <div className="bg-zinc-50 px-4 py-2 border-b border-zinc-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-black text-zinc-800">
                    ความจุ: {v.ram ? `${v.ram}/` : ''}{v.rom || 'มาตรฐาน'}
                  </span>
                  <span className="text-zinc-400">•</span>
                  <span className="text-zinc-600 font-semibold">
                    ฿{v.retailPrice?.toLocaleString() || 0}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 font-medium">
                  {v.colors.reduce((s, c) => s + (c.stock || 0), 0)} เครื่อง
                </span>
              </div>

              {/* Color rows */}
              <div className="divide-y divide-zinc-100 p-2 sm:p-3 space-y-2">
                {v.colors.map((c, cIndex) => {
                  const colorHex = getColorHex(c.colorName);
                  return (
                    <div 
                      key={c.id || cIndex}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 first:pt-0"
                    >
                      {/* Color info + SKU */}
                      <div className="flex items-center gap-2.5 min-w-[140px]">
                        <span 
                          className="w-4 h-4 rounded-full border border-black/10 shadow-2xs shrink-0" 
                          style={{ backgroundColor: colorHex }} 
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-zinc-800 block truncate">
                            {c.colorName || 'สีเริ่มต้น'}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-0.5">
                            <Hash className="w-3 h-3 shrink-0 text-zinc-400" />
                            <input
                              type="text"
                              value={c.sku || ''}
                              onChange={(e) => handleSkuChange(vIndex, cIndex, e.target.value)}
                              placeholder="รหัส SKU"
                              className="w-24 px-1.5 py-0.5 bg-zinc-50 border border-zinc-200 rounded font-mono text-[10px] text-zinc-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
                              title="รหัส SKU (แก้ไขได้)"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Stock Stepper Controls */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                        <span className="text-xs font-semibold text-zinc-500 sm:hidden">จำนวนสต็อค:</span>
                        <div className="flex items-center gap-1.5 bg-zinc-50 p-1 rounded-xl border border-zinc-200">
                          <button
                            type="button"
                            onClick={() => handleStockStep(vIndex, cIndex, -1)}
                            disabled={c.stock <= 0 || saving}
                            className="w-8 h-8 rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 active:scale-90 flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                            title="ลดสต็อค 1"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input 
                            type="number"
                            min="0"
                            value={c.stock}
                            onChange={(e) => handleStockChange(vIndex, cIndex, parseInt(e.target.value))}
                            className="w-16 h-8 text-center font-mono font-bold text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 shadow-inner"
                          />

                          <button
                            type="button"
                            onClick={() => handleStockStep(vIndex, cIndex, 1)}
                            disabled={saving}
                            className="w-8 h-8 rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 active:scale-90 flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 shadow-2xs"
                            title="เพิ่มสต็อค 1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-full transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            id="save-quick-stock-btn"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all cursor-pointer disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>บันทึกสำเร็จ!</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>บันทึกจำนวนสต็อค</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
