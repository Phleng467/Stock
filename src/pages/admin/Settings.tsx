import { useState, useEffect, ChangeEvent, useRef, DragEvent } from 'react';
import CsvUploader from '../../components/CsvUploader';
import Papa from 'papaparse';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Sun, Moon, Monitor, Database, HardDrive, Download, Upload, 
  Image as ImageIcon, Trash2, Plus, Loader2, FileSpreadsheet, Sparkles, 
  UploadCloud, DownloadCloud, ExternalLink, ArrowLeft, ArrowRight, 
  Star, Check
} from 'lucide-react';
import { api } from '../../lib/api';

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Settings() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvFileStatus, setCsvFileStatus] = useState<{name: string; valid: boolean; message: string} | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [reorderSavedMsg, setReorderSavedMsg] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      const res = await fetch('/api/promotions');
      const data = await res.json();
      setPromotions(data.promotions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAIPromo = async () => {
    const prompt = window.prompt("พิมพ์คำอธิบายแบนเนอร์ที่คุณต้องการสร้างด้วย AI (เช่น 'Sale poster with red neon lights, abstract technology background'):");
    if (!prompt) return;
    
    try {
      setAiGenerating(true);
      const res = await api.generateImageAI(prompt, '16:9');
      await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: res.url })
      });
      await fetchPromotions();
      alert('สร้างรูปภาพโปรโมชั่นสำเร็จ!');
    } catch (err: any) {
      console.error(err);
      alert(`ไม่สามารถสร้างรูปภาพได้: ${err.message}`);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleUploadPromotion = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const res = await api.uploadImage(file);
      await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: res.url })
      });
      await fetchPromotions();
    } catch (err) {
      console.error(err);
      alert('อัปโหลดรูปล้มเหลว');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePromotion = async (id: string) => {
    if (!confirm('ยืนยันการลบรูปโปรโมชั่นนี้?')) return;
    try {
      await fetch(`/api/promotions/${id}`, { method: 'DELETE' });
      setPromotions(promotions.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
      alert('ลบรูปล้มเหลว');
    }
  };

  const savePromotionsOrder = async (orderedPromos: any[]) => {
    try {
      setReordering(true);
      const res = await fetch('/api/promotions/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotions: orderedPromos })
      });
      if (res.ok) {
        setReorderSavedMsg(true);
        setTimeout(() => setReorderSavedMsg(false), 2500);
      }
    } catch (err) {
      console.error('Error saving promotions order:', err);
    } finally {
      setReordering(false);
    }
  };

  const handleMovePromotion = async (index: number, direction: 'prev' | 'next') => {
    if (direction === 'prev' && index === 0) return;
    if (direction === 'next' && index === promotions.length - 1) return;

    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
    const newPromos = [...promotions];
    const temp = newPromos[index];
    newPromos[index] = newPromos[targetIndex];
    newPromos[targetIndex] = temp;

    setPromotions(newPromos);
    await savePromotionsOrder(newPromos);
  };

  const handleSetFirstPromotion = async (index: number) => {
    if (index === 0) return;
    const newPromos = [...promotions];
    const [selected] = newPromos.splice(index, 1);
    newPromos.unshift(selected);

    setPromotions(newPromos);
    await savePromotionsOrder(newPromos);
  };

  const handleDragStart = (e: DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newPromos = [...promotions];
    const [draggedItem] = newPromos.splice(draggedIndex, 1);
    newPromos.splice(targetIndex, 0, draggedItem);

    setDraggedIndex(null);
    setPromotions(newPromos);
    await savePromotionsOrder(newPromos);
  };

  // CSV EXPORT LOGIC
  const handleExportCSV = async () => {
    try {
      setCsvLoading(true);
      const products = await api.getProducts();
      const brands = await api.getBrands();
      
      const brandMap = new Map(brands.map(b => [b.id, b.name]));

      const csvRows = [
        ['ID', 'Brand', 'Model', 'Category', 'Base Price', 'Cost Price', 'Description'] // Header
      ];

      products.forEach(p => {
        csvRows.push([
          p.id || '',
          brandMap.get(p.brandId) || p.brandId,
          p.model || '',
          p.category || '',
          p.basePrice?.toString() || '0',
          p.costPrice?.toString() || '0',
          `"${(p.description || '').replace(/"/g, '""')}"` // Escape quotes
        ]);
      });

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `jaymart_products_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถส่งออกไฟล์ CSV ได้');
    } finally {
      setCsvLoading(false);
    }
  };

  // CSV IMPORT LOGIC
  const handleImportCSV = (fileOrEvent: any) => {
    const file = fileOrEvent?.target?.files ? fileOrEvent.target.files[0] : fileOrEvent;
    if (!file) return;

    if (file.name.endsWith('.csv')) {
      setCsvLoading(true);
      setCsvFileStatus({ name: file.name, valid: true, message: 'กำลังประมวลผลไฟล์...' });

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: async (results) => {
          try {
            const newPromotions = results.data.map((row: any, index: number) => {
              const normalPrice = parseFloat((row['ราคาปกติ'] || '0').toString().replace(/,/g, '')) || 0;
              const sdcAmount = parseFloat((row['ช่วยดาวน์ SDC'] || '0').toString().replace(/,/g, '')) || 0;
              const takeDeviceAmount = parseFloat((row['รับเครื่อง'] || '0').toString().replace(/,/g, '')) || 0;
              
              return {
                id: `import-${Date.now()}-${index}`,
                brand: row['แบรนด์']?.trim() || 'Unknown',
                model: row['รุ่น']?.trim() || 'Unknown',
                normalPrice: normalPrice,
                sdcAmount: sdcAmount,
                takeDeviceAmount: takeDeviceAmount,
                duration: row['ระยะเวลา']?.trim() || '',
                note: row['หมายเหตุ']?.trim() || ''
              };
            });

            const validPromotions = newPromotions.filter((p: any) => p.model && p.model !== 'Unknown');

            if (validPromotions.length === 0) {
              setCsvFileStatus({ name: file.name, valid: false, message: 'ไม่พบข้อมูล หรือหัวคอลัมน์ไม่ตรงตามรูปแบบ' });
              return;
            }

            await api.saveSdcPromotions(validPromotions);
            setCsvFileStatus({ name: file.name, valid: true, message: `อัปเดตข้อมูล ${validPromotions.length} รายการสำเร็จ` });
          } catch (error) {
            setCsvFileStatus({ name: file.name, valid: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
          } finally {
            setCsvLoading(false);
          }
        },
        error: (error) => {
          setCsvFileStatus({ name: file.name, valid: false, message: 'ไม่สามารถอ่านไฟล์ CSV ได้' });
          setCsvLoading(false);
        }
      });
    } else {
      setCsvFileStatus({ name: file.name, valid: false, message: 'กรุณาอัปโหลดไฟล์นามสกุล .csv เท่านั้น' });
    }
  };

  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);
  const [syncingGoogleSheets, setSyncingGoogleSheets] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch settings to get spreadsheetId
    api.getSettings().then(settings => {
      if (settings && settings.spreadsheetId) {
        setSpreadsheetId(settings.spreadsheetId);
      }
    }).catch(err => console.error('Failed to load settings:', err));

    import('../../lib/firebaseAuth').then(({ initAuth }) => {
      initAuth((user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      }, () => {
        setGoogleUser(null);
        setGoogleToken(null);
      });
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoggingInGoogle(true);
    try {
      const { googleSignIn } = await import('../../lib/firebaseAuth');
      const result = await googleSignIn();
      if (result) {
        setGoogleToken(result.accessToken);
        setGoogleUser(result.user);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      alert('เชื่อมต่อ Google ล้มเหลว');
    } finally {
      setIsLoggingInGoogle(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      const { logout } = await import('../../lib/firebaseAuth');
      await logout();
      setGoogleUser(null);
      setGoogleToken(null);
    } catch (err: any) {
      console.error('Logout failed:', err);
    }
  };

  const handlePushToGoogleSheets = async () => {
    if (!googleToken) {
      alert('กรุณาลงชื่อเข้าใช้ Google ก่อนซิงค์ข้อมูล');
      return;
    }
    
    setSyncingGoogleSheets(true);
    try {
      const { googleSheetsSyncService } = await import('../../lib/googleSheetsSync');
      const result = await googleSheetsSyncService.pushLocalInventory(googleToken);
      if (result.success) {
        if (result.spreadsheetId) setSpreadsheetId(result.spreadsheetId);
        alert('ส่งออกข้อมูลไปยัง Google Sheets เรียบร้อยแล้ว');
      } else {
        alert('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
      }
    } catch (err: any) {
      console.error('Push error:', err);
      alert('ส่งออกข้อมูลล้มเหลว: ' + err.message);
    } finally {
      setSyncingGoogleSheets(false);
    }
  };

  const handlePullFromGoogleSheets = async () => {
    if (!googleToken) {
      alert('กรุณาลงชื่อเข้าใช้ Google ก่อนดึงข้อมูล');
      return;
    }
    
    setSyncingGoogleSheets(true);
    try {
      const { googleSheetsSyncService } = await import('../../lib/googleSheetsSync');
      const result = await googleSheetsSyncService.fetchLatestSheetData(googleToken);
      if (result.success) {
        if (result.spreadsheetId) setSpreadsheetId(result.spreadsheetId);
        alert('ดึงข้อมูลล่าสุดจาก Google Sheets เรียบร้อยแล้ว');
      } else {
        alert('เกิดข้อผิดพลาดในการดึงข้อมูล');
      }
    } catch (err: any) {
      console.error('Pull error:', err);
      alert('ดึงข้อมูลล้มเหลว: ' + err.message);
    } finally {
      setSyncingGoogleSheets(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ตั้งค่าระบบ & จัดการข้อมูล</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Theme Settings Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 col-span-1 md:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg mr-4">
                <Sun className="w-6 h-6 hidden dark:block" />
                <Moon className="w-6 h-6 block dark:hidden" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">ธีมและการแสดงผล (Theme)</h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400">สลับการแสดงผลระหว่างโหมดสว่างและโหมดมืด</p>
              </div>
            </div>
            
            <ThemeSelector />
          </div>
        </div>

        
        {/* Promotion Management Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 col-span-1 md:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center">
              <div className="p-3 bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 rounded-lg mr-4">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">จัดการรูปโปรโมชั่น</h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400">อัปเดตแบนเนอร์และปรับเปลี่ยนลำดับการแสดงผลหน้าร้าน (Storefront)</p>
              </div>
            </div>

            {reorderSavedMsg && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-full border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                บันทึกลำดับเรียบร้อย
              </span>
            )}
          </div>

          <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-5 bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 flex items-start gap-2.5">
            <span className="text-base leading-none">💡</span>
            <div>
              <strong>วิธีจัดลำดับรูปภาพ:</strong> รูปใน <span className="text-pink-600 dark:text-pink-400 font-bold">ลำดับที่ 1 (ภาพแรก)</span> จะเป็นภาพหลักที่ลูกค้าเห็นทันทีเมื่อเปิดเข้าสู่หน้าร้าน และจะหมุนเวียนสไลด์ตามลำดับต่อไปนี้ 
              <span className="block mt-0.5 text-zinc-500">คุณสามารถกดปุ่ม <strong>⬅️ อยู่ก่อน</strong> หรือ <strong>อยู่หลัง ➡️</strong> (หรือกด <strong>⭐ เป็นรูปแรก</strong> / ลากสลับตำแหน่ง) เพื่อเรียงลำดับได้ทันที ระบบจะบันทึกลำดับให้อัตโนมัติ</span>
            </div>
          </div>
          
          <div>
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : promotions.length === 0 ? (
              <div className="text-center py-10 px-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl mb-5">
                <ImageIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500 font-medium">ยังไม่มีรูปโปรโมชั่น</p>
                <p className="text-xs text-zinc-400 mt-1">อัปโหลดรูปภาพใหม่หรือสร้างด้วย AI ด้านล่าง</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {promotions.map((promo, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === promotions.length - 1;
                  return (
                    <div 
                      key={promo.id || idx}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, idx)}
                      className={cn(
                        "group relative flex flex-col bg-white dark:bg-zinc-800/90 rounded-xl overflow-hidden border transition-all duration-200 shadow-xs hover:shadow-md",
                        isFirst 
                          ? "border-pink-300 dark:border-pink-800/80 ring-2 ring-pink-500/20" 
                          : "border-gray-200 dark:border-zinc-700",
                        draggedIndex === idx ? "opacity-50 scale-95" : ""
                      )}
                    >
                      {/* Top Header on Card: Order Number & Delete */}
                      <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-700/80 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isFirst ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-900/60 px-2.5 py-0.5 rounded-full border border-pink-200 dark:border-pink-700 shadow-2xs">
                              <Star className="w-3 h-3 fill-pink-500 text-pink-500" />
                              ลำดับ 1 (ภาพแรก)
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[11px] font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-200/80 dark:bg-zinc-700 px-2.5 py-0.5 rounded-full">
                              ลำดับที่ {idx + 1}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-zinc-400 font-mono select-none">
                            {idx + 1} จาก {promotions.length}
                          </span>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeletePromotion(promo.id);
                            }}
                            className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors cursor-pointer"
                            title="ลบรูปโปรโมชั่นนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Image Preview Container */}
                      <div className="relative aspect-[16/9] sm:aspect-[4/3] bg-zinc-100 dark:bg-zinc-900 overflow-hidden cursor-grab active:cursor-grabbing">
                        <img 
                          src={promo.url} 
                          alt={`Promo ${idx + 1}`} 
                          className="w-full h-full object-cover select-none pointer-events-none" 
                        />
                      </div>

                      {/* Bottom Reorder Controls */}
                      <div className="p-2.5 bg-white dark:bg-zinc-800 border-t border-zinc-100 dark:border-zinc-700/80 flex items-center justify-between gap-1.5">
                        {/* Move Earlier Button */}
                        <button
                          type="button"
                          onClick={() => handleMovePromotion(idx, 'prev')}
                          disabled={isFirst || reordering}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer select-none",
                            isFirst 
                              ? "opacity-25 border-transparent text-zinc-400 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800" 
                              : "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-700/50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-600 active:scale-95 shadow-2xs"
                          )}
                          title="เลื่อนให้อยู่ก่อนหน้า (แสดงก่อน)"
                        >
                          <ArrowLeft className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                          <span>อยู่ก่อน</span>
                        </button>

                        {/* Set as #1 Quick Button */}
                        {!isFirst && (
                          <button
                            type="button"
                            onClick={() => handleSetFirstPromotion(idx)}
                            disabled={reordering}
                            className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/40 dark:hover:bg-pink-900/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 transition-all active:scale-95 cursor-pointer shadow-2xs select-none"
                            title="ตั้งให้รูปนี้เป็นภาพแรกสุดทันที"
                          >
                            <Star className="w-3 h-3 text-pink-500 fill-pink-500" />
                            <span>รูปแรก</span>
                          </button>
                        )}

                        {/* Move Later Button */}
                        <button
                          type="button"
                          onClick={() => handleMovePromotion(idx, 'next')}
                          disabled={isLast || reordering}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer select-none",
                            isLast 
                              ? "opacity-25 border-transparent text-zinc-400 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800" 
                              : "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-700/50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-600 active:scale-95 shadow-2xs"
                          )}
                          title="เลื่อนให้อยู่ด้านหลัง (แสดงทีหลัง)"
                        >
                          <span>อยู่หลัง</span>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex-1 flex justify-center items-center px-4 py-2.5 bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800 rounded-xl shadow-2xs text-sm font-semibold text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/40 transition-colors cursor-pointer select-none">
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {uploading ? 'กำลังอัปโหลด...' : 'เพิ่มรูปโปรโมชั่นใหม่ (อัปโหลดรูป)'}
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadPromotion} disabled={uploading || aiGenerating} />
              </label>
              <button 
                onClick={handleGenerateAIPromo}
                disabled={aiGenerating || uploading}
                className="flex-1 flex justify-center items-center px-4 py-2.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl shadow-2xs text-sm font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors cursor-pointer disabled:opacity-50 select-none"
              >
                {aiGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2 text-purple-500" />}
                {aiGenerating ? 'AI กำลังวาดภาพ...' : 'สร้างภาพโปรโมชั่นด้วย AI'}
              </button>
            </div>
          </div>
        </div>

        {/* CSV Excel Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg mr-4">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">จัดการข้อมูลผ่านไฟล์ Excel (CSV) / Google Sheets</h2>
              <p className="text-sm text-gray-500">นำเข้า ส่งออก หรือ ซิงค์ข้อมูลกับ Google Sheets</p>
            </div>
          </div>
          <div className="space-y-3 mt-6">
            <CsvUploader onFileSelect={handleImportCSV} status={csvFileStatus} />
            
            <button 
              onClick={handleExportCSV}
              disabled={csvLoading}
              className="w-full mt-3 flex justify-center items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              {csvLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-gray-400" /> : <Download className="w-4 h-4 mr-2 text-gray-400" />}
              ดาวน์โหลดไฟล์ชีท CSV ปัจจุบัน
            </button>
            
            <div className="pt-4 mt-2 border-t border-gray-100">
              {googleUser ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                     <div className="flex items-center gap-3">
                        <img src={googleUser.photoURL || 'https://via.placeholder.com/32'} alt="Profile" className="w-8 h-8 rounded-full" />
                        <div>
                          <p className="text-xs font-semibold text-gray-900">เชื่อมต่อแล้ว</p>
                          <p className="text-[10px] text-gray-500">{googleUser.email}</p>
                        </div>
                     </div>
                     <button onClick={handleGoogleSignOut} className="text-xs text-red-600 hover:text-red-700 font-medium">ยกเลิก</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={handlePushToGoogleSheets}
                      disabled={syncingGoogleSheets}
                      className="w-full flex justify-center items-center px-4 py-3 bg-[#4285F4] hover:bg-[#3367d6] text-white rounded-xl shadow-md text-sm font-bold transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    >
                      {syncingGoogleSheets ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                      ส่งข้อมูลขึ้นชีท
                    </button>
                    <button 
                      onClick={handlePullFromGoogleSheets}
                      disabled={syncingGoogleSheets}
                      className="w-full flex justify-center items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {syncingGoogleSheets ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DownloadCloud className="w-4 h-4 mr-2" />}
                      ดึงข้อมูลจากชีท
                    </button>
                  </div>
                  {spreadsheetId && (
                    <a 
                      href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full mt-2 flex justify-center items-center px-4 py-2 bg-white border border-green-600 text-green-700 hover:bg-green-50 rounded-lg shadow-sm text-sm font-medium transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      เปิดแผ่นงาน Google Sheets
                    </a>
                  )}
                </div>
              ) : (
                <button 
                  onClick={handleGoogleSignIn}
                  disabled={isLoggingInGoogle}
                  className="w-full flex justify-center items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 mr-2" />
                  {isLoggingInGoogle ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อบัญชี Google (เพื่อใช้ Google Sheets)'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Backup Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg mr-4">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">การสำรองข้อมูลขั้นสูง (JSON Backup)</h2>
              <p className="text-sm text-gray-500">สำรองฐานข้อมูลทั้งหมด (รวมสีและสเปค)</p>
            </div>
          </div>
          <div className="space-y-3 mt-6">
            <button className="w-full flex justify-center items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
              <Download className="w-4 h-4 mr-2 text-gray-400" />
              ดาวน์โหลด Backup ล่าสุด (.json)
            </button>
            <button className="w-full flex justify-center items-center px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg shadow-sm text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer">
              <Upload className="w-4 h-4 mr-2 text-indigo-500" />
              อัปโหลดเพื่อกู้คืนข้อมูล
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}


function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="flex p-1 bg-gray-100 dark:bg-zinc-800/50 rounded-xl w-full md:w-auto self-start">
      <button
        onClick={() => setTheme('light')}
        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
          theme === 'light' 
            ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/50' 
            : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
        }`}
      >
        <Sun className="w-4 h-4" /> สว่าง
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
          theme === 'dark' 
            ? 'bg-zinc-800 text-indigo-400 shadow-sm border border-zinc-700' 
            : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
        }`}
      >
        <Moon className="w-4 h-4" /> มืด
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
          theme === 'system' 
            ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-200/50 dark:border-zinc-700' 
            : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
        }`}
      >
        <Monitor className="w-4 h-4" /> ตามระบบ
      </button>
    </div>
  );
}
