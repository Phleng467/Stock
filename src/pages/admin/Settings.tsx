import { useState, useEffect, ChangeEvent, useRef } from 'react';
import CsvUploader from '../../components/CsvUploader';
import Papa from 'papaparse';
import { Database, HardDrive, Download, Upload, Image as ImageIcon, Trash2, Plus, Loader2, FileSpreadsheet, Sparkles, UploadCloud, DownloadCloud, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';

export default function Settings() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvFileStatus, setCsvFileStatus] = useState<{name: string; valid: boolean; message: string} | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
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
      <h1 className="text-2xl font-bold text-gray-900">ตั้งค่าระบบ & จัดการข้อมูล</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Promotion Management Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-pink-50 text-pink-600 rounded-lg mr-4">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">จัดการรูปโปรโมชั่น</h2>
              <p className="text-sm text-gray-500">อัปเดตแบนเนอร์หน้าร้าน (Storefront)</p>
            </div>
          </div>
          
          <div className="mt-4">
            {loading ? (
              <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {promotions.map(promo => (
                  <div key={promo.id} className="relative group aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    <img src={promo.url} alt="Promo" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeletePromotion(promo.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm cursor-pointer z-10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label className="w-full flex justify-center items-center px-4 py-2 bg-pink-50 border border-pink-200 rounded-lg shadow-sm text-sm font-medium text-pink-700 hover:bg-pink-100 transition-colors cursor-pointer">
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {uploading ? 'กำลังอัปโหลด...' : 'เพิ่มรูปโปรโมชั่นใหม่ (อัปโหลดเอง)'}
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadPromotion} disabled={uploading || aiGenerating} />
              </label>
              <button 
                onClick={handleGenerateAIPromo}
                disabled={aiGenerating || uploading}
                className="w-full flex justify-center items-center px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg shadow-sm text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                {aiGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2 text-purple-500" />}
                {aiGenerating ? 'AI กำลังวาดภาพ...' : 'สร้างภาพพื้นหลังด้วย AI'}
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
