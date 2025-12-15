
import React, { useEffect, useRef, useState } from 'react';
import { X, RefreshCw, Check, Image as ImageIcon, RotateCcw, Crop, RotateCw, Square, Monitor, Smartphone, Maximize2, AlertCircle, Settings } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageData: string) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null); // Store original for reverting
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isSwitching, setIsSwitching] = useState(false);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!capturedImage) {
         startCamera();
         enumerateDevices();
      }
    } else {
      stopCamera();
      resetState();
    }
    return () => stopCamera();
  }, [isOpen, facingMode]);

  const resetState = () => {
    setCapturedImage(null);
    setOriginalImage(null);
    setError(null);
    setIsEditing(false);
  };

  const enumerateDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
    } catch (err) {
      console.error("Error enumerating devices:", err);
    }
  };

  const startCamera = async () => {
    setIsSwitching(true);
    stopCamera();
    setError(null);

    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      // Fallback
      setError("Unable to access camera.");
    } finally {
      setIsSwitching(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mirror if user facing
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
        setCapturedImage(dataUrl);
        setOriginalImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setOriginalImage(null);
    setIsEditing(false);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  // --- Edit / Crop Logic ---

  const enterEditMode = () => {
    setIsEditing(true);
  };

  const cancelEdit = () => {
    // Revert to original capture state
    setCapturedImage(originalImage);
    setIsEditing(false);
  };

  const saveEdit = () => {
    // Commit changes (capturedImage is already updated during edits)
    setIsEditing(false);
  };

  const rotateImage = () => {
    if (!capturedImage) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Swap width/height for 90deg rotation
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(90 * Math.PI / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.90));
      }
    };
    img.src = capturedImage;
  };

  const applyCrop = (aspectRatio: number | null) => {
    if (!originalImage) return;
    
    // If aspect ratio is null, reset to original
    if (aspectRatio === null) {
      setCapturedImage(originalImage);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imgW = img.width;
      const imgH = img.height;
      const imgAspect = imgW / imgH;

      let cropW, cropH, cropX, cropY;

      if (aspectRatio === 1) {
        // Square: take smaller dimension
        const side = Math.min(imgW, imgH);
        cropW = side;
        cropH = side;
        cropX = (imgW - side) / 2;
        cropY = (imgH - side) / 2;
      } else if (aspectRatio > 1) {
        // Landscape (e.g. 4:3)
        // If image is wider than target aspect
        if (imgAspect > aspectRatio) {
          cropH = imgH;
          cropW = imgH * aspectRatio;
        } else {
          cropW = imgW;
          cropH = imgW / aspectRatio;
        }
        cropX = (imgW - cropW) / 2;
        cropY = (imgH - cropH) / 2;
      } else {
        // Portrait (e.g. 3:4)
        if (imgAspect > aspectRatio) {
          cropH = imgH;
          cropW = imgH * aspectRatio;
        } else {
          cropW = imgW;
          cropH = imgW / aspectRatio;
        }
        cropX = (imgW - cropW) / 2;
        cropY = (imgH - cropH) / 2;
      }

      canvas.width = cropW;
      canvas.height = cropH;

      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      setCapturedImage(canvas.toDataURL('image/jpeg', 0.90));
    };
    img.src = originalImage; // Always crop from original source to prevent degradation
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center sm:p-4 animate-fade-in">
      {/* Modal Container */}
      <div className="relative w-full h-full sm:max-w-2xl sm:h-auto sm:aspect-[3/4] sm:max-h-[90vh] bg-black sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl ring-1 ring-white/10">
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <div className="text-white font-medium text-sm drop-shadow-md flex items-center gap-2 pointer-events-auto">
            {isEditing ? (
              <span className="flex items-center gap-2">
                <Crop size={16} /> Edit Photo
              </span>
            ) : capturedImage ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" /> Preview
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Camera
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all pointer-events-auto"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          
          {error ? (
            /* Error / Fallback State */
            <div className="text-center p-6 space-y-4 max-w-xs animate-fade-in">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-1">
                 <p className="text-white font-bold text-lg">Access Denied</p>
                 <p className="text-gray-400 text-sm">Please allow camera access in your browser settings to take a photo.</p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={() => document.getElementById('file-upload-trigger')?.click()}
                  className="px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <ImageIcon size={18} /> Upload Photo
                </button>
                <button 
                  onClick={onClose}
                  className="text-gray-500 hover:text-white text-sm"
                >
                  Cancel
                </button>
              </div>
              <div className="text-[10px] text-gray-600 flex items-center justify-center gap-1">
                 <Settings size={12} /> Check browser permissions
              </div>
            </div>
          ) : (
            /* Camera / Preview State */
            <>
              {capturedImage ? (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                  <img 
                    src={capturedImage} 
                    alt="Captured" 
                    className={`max-w-full max-h-full object-contain transition-all duration-300 ${isEditing ? 'scale-90' : 'scale-100'}`}
                  />
                </div>
              ) : (
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover transition-transform duration-500 ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${isSwitching ? 'opacity-0' : 'opacity-100'}`}
                />
              )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls Footer - Only show if camera active and no error */}
        {!error && (
          <div className="p-8 pb-10 bg-black/80 backdrop-blur-md z-20">
            {isEditing ? (
                 /* EDIT MODE CONTROLS */
                 <div className="flex flex-col gap-6 animate-fade-in-up">
                    <div className="flex justify-center gap-6">
                      <button onClick={() => applyCrop(null)} className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors" title="Original">
                         <Maximize2 size={20} />
                         <span className="text-[10px] font-medium">Original</span>
                      </button>
                      <button onClick={() => applyCrop(1)} className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors" title="Square">
                         <Square size={20} />
                         <span className="text-[10px] font-medium">1:1</span>
                      </button>
                      <button onClick={() => applyCrop(4/3)} className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors" title="4:3">
                         <Monitor size={20} />
                         <span className="text-[10px] font-medium">4:3</span>
                      </button>
                      <button onClick={() => applyCrop(3/4)} className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors" title="3:4">
                         <Smartphone size={20} />
                         <span className="text-[10px] font-medium">3:4</span>
                      </button>
                      <div className="w-px h-8 bg-white/20 mx-2"></div>
                      <button onClick={rotateImage} className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors" title="Rotate">
                         <RotateCw size={20} />
                         <span className="text-[10px] font-medium">Rotate</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <button
                        onClick={cancelEdit}
                        className="flex-1 py-3 rounded-xl font-bold text-white bg-gray-800 hover:bg-gray-700 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        className="flex-1 py-3 rounded-xl font-bold text-white bg-teal-500 hover:bg-teal-600 shadow-lg shadow-teal-500/20 transition-all"
                      >
                        Done
                      </button>
                    </div>
                 </div>
              ) : capturedImage ? (
                /* REVIEW MODE CONTROLS */
                <div className="flex items-center justify-between gap-3 animate-fade-in">
                  <button
                    onClick={handleRetake}
                    className="flex flex-col items-center gap-1 p-2 text-white/80 hover:text-white transition-colors min-w-[60px]"
                  >
                    <RotateCcw size={20} />
                    <span className="text-[10px] font-medium">Retake</span>
                  </button>

                  <button
                    onClick={enterEditMode}
                    className="flex flex-col items-center gap-1 p-2 text-white/80 hover:text-white transition-colors min-w-[60px]"
                  >
                    <Crop size={20} />
                    <span className="text-[10px] font-medium">Edit</span>
                  </button>

                  <button
                    onClick={handleConfirm}
                    className="flex-1 ml-2 py-3 px-6 rounded-xl font-bold text-white bg-teal-500 hover:bg-teal-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/30 active:scale-95"
                  >
                    <Check size={20} />
                    Use Photo
                  </button>
                </div>
              ) : (
                /* CAPTURE MODE CONTROLS */
                <div className="flex items-center justify-between max-w-xs mx-auto w-full animate-fade-in">
                  <button 
                    onClick={() => { onClose(); document.getElementById('file-upload-trigger')?.click(); }}
                    className="p-3 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-all active:scale-90"
                    title="Upload from Gallery"
                  >
                    <ImageIcon size={24} />
                  </button>

                  <button
                    onClick={handleCapture}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative group transition-transform active:scale-95"
                    aria-label="Take Photo"
                  >
                    <div className="w-16 h-16 bg-white rounded-full group-hover:scale-90 transition-transform duration-200" />
                  </button>

                  <button 
                    onClick={toggleCamera}
                    disabled={devices.length < 2} 
                    className={`p-3 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-all active:scale-90 ${devices.length < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Switch Camera"
                  >
                    <RefreshCw size={24} className={isSwitching ? "animate-spin" : ""} />
                  </button>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};
