import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from './ProductCard';

interface CsvUploaderProps {
  onFileSelect: (file: File) => void;
  loading?: boolean;
  status: { name: string; valid: boolean; message: string } | null;
}

export default function CsvUploader({ onFileSelect, loading, status }: CsvUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors",
          isDragging ? "border-emerald-500 bg-emerald-50" : "border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100",
          status?.valid ? "border-emerald-500 bg-emerald-50/50" : "",
          status?.valid === false ? "border-red-500 bg-red-50/50" : ""
        )}
      >
        <input
          type="file"
          accept=".csv"
          className="hidden"
          ref={fileInputRef}
          onChange={handleChange}
          disabled={loading}
        />
        
        {loading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-3" />
            <p className="text-sm font-medium text-gray-700">กำลังประมวลผลไฟล์...</p>
          </div>
        ) : status ? (
          <div className="flex flex-col items-center text-center">
            {status.valid ? (
              <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
            ) : (
              <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
            )}
            <p className="text-sm font-bold text-gray-900">{status.name}</p>
            <p className={cn("text-sm mt-1", status.valid ? "text-emerald-600" : "text-red-600")}>
              {status.message}
            </p>
            <p className="text-xs text-gray-500 mt-4 underline">คลิกหรือลากไฟล์ใหม่เพื่อเปลี่ยน</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
              <Upload className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">คลิกเพื่ออัปโหลด หรือลากไฟล์มาวางที่นี่</p>
            <p className="text-xs text-gray-500 mt-1">รองรับเฉพาะไฟล์ .CSV เท่านั้น</p>
          </div>
        )}
      </div>
    </div>
  );
}
