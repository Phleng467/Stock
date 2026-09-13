import { Database, HardDrive, Download, Upload } from 'lucide-react';

export default function Settings() {
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
            <button className="w-full flex justify-center items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4 mr-2 text-gray-400" />
              ดาวน์โหลด Backup ล่าสุด (.json)
            </button>
            <button className="w-full flex justify-center items-center px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg shadow-sm text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors">
              <Upload className="w-4 h-4 mr-2 text-indigo-500" />
              อัปโหลดเพื่อกู้คืนข้อมูล
            </button>
          </div>
        </div>

        {/* Quota Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg mr-4">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">โควต้ารูปภาพ (Image Quota)</h2>
              <p className="text-sm text-gray-500">พื้นที่จัดเก็บรูปภาพในระบบ</p>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-1 font-medium">
              <span className="text-gray-700">ใช้ไป 120 MB</span>
              <span className="text-gray-500">จาก 1000 MB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '12%' }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              หมายเหตุ: หากใช้ API เก็บรูปภาพ โควต้าจริงจะอิงตามผู้ให้บริการ
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
