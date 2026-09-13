import { useState, useEffect, ChangeEvent } from 'react';
import { Database, HardDrive, Download, Upload, Image as ImageIcon, Trash2, Plus, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

export default function Settings() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">ตั้งค่าระบบ & สำรองข้อมูล</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Backup Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg mr-4">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">การสำรองข้อมูล (Backup)</h2>
              <p className="text-sm text-gray-500">สำรองฐานข้อมูลทั้งหมด หรือ กู้คืน</p>
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
            <label className="w-full flex justify-center items-center px-4 py-2 bg-pink-50 border border-pink-200 rounded-lg shadow-sm text-sm font-medium text-pink-700 hover:bg-pink-100 transition-colors cursor-pointer">
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              {uploading ? 'กำลังอัปโหลด...' : 'เพิ่มรูปโปรโมชั่นใหม่'}
              <input type="file" accept="image/*" className="hidden" onChange={handleUploadPromotion} disabled={uploading} />
            </label>
          </div>
        </div>

      </div>
    </div>
  );
}
