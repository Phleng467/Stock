import { useState, useRef, useEffect, useCallback, ChangeEvent } from 'react';
import { Camera, RefreshCw, X, Check, Image as ImageIcon, Zap, AlertCircle, Sparkles, Sliders } from 'lucide-react';
import { cn } from './ProductCard';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (fileOrDataUrl: string) => Promise<void> | void;
  title?: string;
  subtitle?: string;
}

export default function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  title = 'ถ่ายรูปสินค้าจากกล้อง',
  subtitle = 'ถ่ายรูปตัวเครื่องจริงหรือกล่องสินค้าหน้าร้าน',
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [shutterEffect, setShutterEffect] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:3'>('1:1');

  // Start video stream
  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    setLoadingCamera(true);
    setCameraError(null);

    // Stop current stream if running
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องโดยตรง กรุณาใช้ปุ่มถ่ายด้วยกล้องมือถือ');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1920 }
        },
        audio: false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play().catch(e => console.warn('Play error:', e));
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      let msg = 'ไม่สามารถเข้าถึงกล้องถ่ายรูปได้';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'กรุณากดอนุญาต (Allow) การเข้าถึงกล้องในเบราว์เซอร์ หรือใช้ปุ่มเปิดกล้องมือถือด้านล่าง';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'ไม่พบอุปกรณ์กล้องบนเครื่องนี้';
      }
      setCameraError(msg);
    } finally {
      setLoadingCamera(false);
    }
  }, [stream]);

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      startCamera(facingMode);
    } else {
      // Clean up camera stream on close
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  // Switch between back/front camera
  const handleToggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture frame from video stream
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Trigger visual shutter flash
    setShutterEffect(true);
    setTimeout(() => setShutterEffect(false), 200);

    const canvas = canvasRef.current || document.createElement('canvas');
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;

    let targetWidth = 1000;
    let targetHeight = aspectRatio === '1:1' ? 1000 : 750;

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Center crop to 1:1 or 4:3
    let cropWidth = vw;
    let cropHeight = vh;
    let startX = 0;
    let startY = 0;

    if (aspectRatio === '1:1') {
      const minDim = Math.min(vw, vh);
      cropWidth = minDim;
      cropHeight = minDim;
      startX = (vw - minDim) / 2;
      startY = (vh - minDim) / 2;
    } else {
      // 4:3
      const targetRatio = 4 / 3;
      const currentRatio = vw / vh;
      if (currentRatio > targetRatio) {
        cropWidth = vh * targetRatio;
        cropHeight = vh;
        startX = (vw - cropWidth) / 2;
        startY = 0;
      } else {
        cropWidth = vw;
        cropHeight = vw / targetRatio;
        startX = 0;
        startY = (vh - cropHeight) / 2;
      }
    }

    // Mirror if using front camera
    if (facingMode === 'user') {
      ctx.translate(targetWidth, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
  };

  // Trigger countdown then snapshot
  const handleTimedCapture = (seconds: number) => {
    setCountdown(seconds);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          takeSnapshot();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Native mobile camera input handler fallback
  const handleNativeCameraInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      if (typeof loadEvt.target?.result === 'string') {
        setCapturedImage(loadEvt.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Confirm and apply image
  const handleConfirmImage = async () => {
    if (!capturedImage) return;
    setIsProcessing(true);
    try {
      await onCapture(capturedImage);
      onClose();
    } catch (err) {
      console.error('Failed to attach captured image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5">
      <div className="bg-zinc-950 border border-zinc-800 text-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh] relative animate-in fade-in duration-200">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
              <p className="text-[11px] text-zinc-400">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder / Preview Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[340px] sm:min-h-[400px] overflow-hidden select-none">
          {/* Shutter White Flash */}
          {shutterEffect && (
            <div className="absolute inset-0 bg-white z-30 animate-out fade-out duration-200" />
          )}

          {/* Countdown Indicator */}
          {countdown !== null && (
            <div className="absolute z-20 w-24 h-24 rounded-full bg-red-600/80 backdrop-blur-sm flex items-center justify-center text-white text-5xl font-black animate-pulse shadow-lg">
              {countdown}
            </div>
          )}

          {/* Mode 1: Photo has been captured (Review Screen) */}
          {capturedImage ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-3">
              <div className="relative max-h-[380px] max-w-full rounded-2xl overflow-hidden shadow-xl border border-zinc-700 bg-zinc-900">
                <img
                  src={capturedImage}
                  alt="Captured device"
                  className="max-h-[360px] w-auto object-contain mx-auto"
                />
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold text-emerald-400 flex items-center gap-1 border border-emerald-500/30">
                  <Check className="w-3 h-3" /> บันทึกภาพสำเร็จ
                </div>
              </div>
            </div>
          ) : (
            /* Mode 2: Live Viewfinder */
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "w-full h-full object-cover max-h-[440px]",
                  facingMode === 'user' && "scale-x-[-1]"
                )}
              />

              {/* Product Framing Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div 
                  className={cn(
                    "border-2 border-white/50 rounded-2xl relative transition-all duration-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]",
                    aspectRatio === '1:1' ? 'w-64 h-64 sm:w-72 sm:h-72' : 'w-72 h-56 sm:w-80 sm:h-60'
                  )}
                >
                  {/* Corner Reticles */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-red-500 rounded-tl" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-red-500 rounded-tr" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-red-500 rounded-bl" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-red-500 rounded-br" />

                  {/* Center Crosshair */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <div className="w-6 h-0.5 bg-white" />
                    <div className="w-0.5 h-6 bg-white absolute" />
                  </div>

                  <span className="absolute bottom-2 inset-x-0 text-center text-[10px] font-medium text-white/80 drop-shadow-md">
                    วางตัวเครื่องหรือกล่องให้อยู่ในกรอบ
                  </span>
                </div>
              </div>

              {/* Viewfinder Controls (Aspect, Switch Camera) */}
              <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
                <button
                  type="button"
                  onClick={() => setAspectRatio(prev => prev === '1:1' ? '4:3' : '1:1')}
                  className="bg-black/60 hover:bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-zinc-200 border border-white/10 cursor-pointer"
                >
                  สัดส่วน: {aspectRatio}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleToggleCamera}
                    className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center border border-white/10 active:scale-90 transition-all cursor-pointer"
                    title="สลับกล้องหน้า / กล้องหลัง"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Camera Error or Warning Notice */}
              {cameraError && (
                <div className="absolute inset-0 bg-zinc-950/95 flex flex-col items-center justify-center p-6 text-center space-y-4 z-20">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-zinc-100">ไม่สามารถเปิดกล้องผ่านเบราว์เซอร์ได้</h4>
                    <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">{cameraError}</p>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      เปิดกล้องถ่ายผ่านระบบมือถือ
                    </button>
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode)}
                      className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium cursor-pointer"
                    >
                      ลองเชื่อมต่อใหม่
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hidden Canvas for processing frame */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Hidden native camera file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleNativeCameraInput}
          />
        </div>

        {/* Footer / Control Action Buttons */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {capturedImage ? (
            /* Actions when photo is taken */
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCapturedImage(null)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                ถ่ายใหม่
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmImage}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-md shadow-red-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isProcessing ? 'กำลังบันทึก...' : 'ใช้รูปถ่ายนี้'}
                </button>
              </div>
            </div>
          ) : (
            /* Actions when live viewfinder is active */
            <div className="w-full flex items-center justify-between gap-3">
              {/* Native mobile camera fallback button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-800 px-3 py-2 rounded-xl border border-zinc-700/60 transition-colors cursor-pointer"
                title="ใช้แอปกล้องดั้งเดิมของมือถือ"
              >
                <Camera className="w-3.5 h-3.5 text-zinc-300" />
                <span>แอปกล้องมือถือ</span>
              </button>

              {/* Central Shutter Button */}
              <div className="flex items-center gap-3 mx-auto">
                <button
                  type="button"
                  onClick={() => handleTimedCapture(3)}
                  disabled={!!cameraError || loadingCamera}
                  className="text-[11px] font-semibold text-zinc-400 hover:text-white bg-zinc-800 px-2.5 py-1.5 rounded-lg border border-zinc-700 cursor-pointer"
                  title="นับถอยหลัง 3 วินาทีแล้วถ่าย"
                >
                  3s
                </button>

                <button
                  type="button"
                  onClick={takeSnapshot}
                  disabled={!!cameraError || loadingCamera}
                  className="w-16 h-16 rounded-full border-4 border-white/80 p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:hover:scale-100 shadow-lg shadow-red-600/10"
                >
                  <div className="w-full h-full rounded-full bg-red-600 hover:bg-red-500 transition-colors" />
                </button>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                ปิด
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
