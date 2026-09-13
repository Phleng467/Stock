import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { SdcPromotion } from '../../types';
import { Upload, FileDown, AlertCircle, Percent, Save, Loader2, Trash2 } from 'lucide-react';
import AdminToast, { ToastItem } from '../../components/AdminToast';

export default function AdminSdc() {
  const [promotions, setPromotions] = useState<SdcPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await api.getSdcPromotions();
      setPromotions(data);
    } catch (e) {
      showToast('error', 'โหลดข้อมูลล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    const newToast: ToastItem = { id: Date.now().toString(), type, message };
    setToasts(prev => [...prev, newToast]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        // parse CSV or TSV
        const delimiter = text.includes('\t') ? '\t' : (text.includes(';') ? ';' : ',');
        const rows = text.split('\n').map(row => row.trim()).filter(row => row);
        
        if (rows.length < 2) {
          showToast('error', 'ไฟล์ไม่มีข้อมูล (ต้องมี Header และ Data)');
          return;
        }

        const parsedPromotions: SdcPromotion[] = [];
        // Skip header
        for (let i = 1; i < rows.length; i++) {
          // split but respect quotes if any
          const cols = rows[i].split(new RegExp(`(?:^|${delimiter})(?=(?:[^"]*"[^"]*")*[^"]*$)(?![^"]*"[^"]*${delimiter})`))
            .map(c => c.replace(/^"|"$/g, '').trim());
          
          if (cols.length >= 6) {
            parsedPromotions.push({
              id: Math.random().toString(36).substring(7),
              brand: cols[0] || '',
              model: cols[1] || '',
              normalPrice: parseFloat(cols[2]?.replace(/[^0-9.-]+/g, '') || '0'),
              sdcAmount: parseFloat(cols[3]?.replace(/[^0-9.-]+/g, '') || '0'),
              takeDeviceAmount: parseFloat(cols[4]?.replace(/[^0-9.-]+/g, '') || '0'),
              duration: cols[5] || '',
              note: cols[6] || ''
            });
          } else {
             // Try fallback simple split
             const fbCols = rows[i].split(delimiter);
             parsedPromotions.push({
              id: Math.random().toString(36).substring(7),
              brand: fbCols[0]?.trim() || '',
              model: fbCols[1]?.trim() || '',
              normalPrice: parseFloat(fbCols[2]?.replace(/[^0-9.-]+/g, '') || '0'),
              sdcAmount: parseFloat(fbCols[3]?.replace(/[^0-9.-]+/g, '') || '0'),
              takeDeviceAmount: parseFloat(fbCols[4]?.replace(/[^0-9.-]+/g, '') || '0'),
              duration: fbCols[5]?.trim() || '',
              note: fbCols[6]?.trim() || ''
            });
          }
        }

        setPromotions(parsedPromotions);
        showToast('success', `โหลดข้อมูลสำเร็จ ${parsedPromotions.length} รายการ (ยังไม่ได้บันทึก)`);
      } catch (err) {
        console.error(err);
        showToast('error', 'รูปแบบไฟล์ไม่ถูกต้อง');
      }
    };
    reader.readAsText(file, 'utf-8'); // Assume UTF-8. Might need TIS-620 if excel CSV
    
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.saveSdcPromotions(promotions);
      showToast('success', 'บันทึกข้อมูลเรียบร้อย');
    } catch (e) {
      showToast('error', 'บันทึกล้มเหลว');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <Percent className="w-6 h-6 text-emerald-600" />
            จัดการโปรโมชั่นช่วยดาวน์ SDC
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">อัปโหลดไฟล์ CSV (แบรนด์, รุ่น, ราคาปกติ, ช่วยดาวน์, รับเครื่อง, ระยะเวลา, หมายเหตุ)</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="file"
            accept=".csv, .tsv, .txt"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 text-zinc-700 font-semibold rounded-xl hover:bg-zinc-50 active:scale-95 transition-all text-sm shadow-2xs"
          >
            <Upload className="w-4 h-4" />
            อัปโหลด CSV
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 active:scale-95 transition-all text-sm shadow-2xs disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            บันทึกขึ้นระบบ
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-bold">รูปแบบไฟล์ CSV ที่รองรับ:</p>
          <p>ต้องมีคอลัมน์ตามลำดับดังนี้: <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900">แบรนด์, รุ่น, ราคาปกติ, ช่วยดาวน์ SDC, รับเครื่อง, ระยะเวลา, หมายเหตุ</code></p>
          <p className="text-xs opacity-80 mt-2">* รองรับการคั่นด้วยลูกน้ำ (,) หรือ Tab</p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-2xs border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500">
                <tr>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">แบรนด์</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">รุ่น</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">ราคาปกติ</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">ช่วยดาวน์ SDC</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">รับเครื่อง</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">ระยะเวลา</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider">หมายเหตุ</th>
                  <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-right">ลบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {promotions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-zinc-400">
                      ไม่มีข้อมูลโปรโมชั่น โปรดอัปโหลดไฟล์ CSV
                    </td>
                  </tr>
                ) : (
                  promotions.map((p, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-3 font-semibold text-zinc-900">{p.brand}</td>
                      <td className="px-6 py-3 font-medium text-zinc-900">{p.model}</td>
                      <td className="px-6 py-3 text-right tabular-nums">฿{p.normalPrice?.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right font-bold text-blue-600 tabular-nums">฿{p.sdcAmount?.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-600 tabular-nums">฿{p.takeDeviceAmount?.toLocaleString()}</td>
                      <td className="px-6 py-3 text-zinc-600">{p.duration}</td>
                      <td className="px-6 py-3 text-zinc-500 text-xs truncate max-w-[200px]">{p.note}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => setPromotions(promotions.filter((_, i) => i !== idx))}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-zinc-50 px-6 py-3 border-t border-zinc-200 text-xs text-zinc-500 font-medium">
            รวมทั้งหมด {promotions.length} รายการ
          </div>
        </div>
      )}

      <AdminToast toasts={toasts} onDismiss={(id) => setToasts(t => t.filter(x => x.id !== id))} />
    </div>
  );
}
