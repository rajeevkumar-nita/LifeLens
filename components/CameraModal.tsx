import React, { useState, useRef, useEffect } from 'react';
import { X, RotateCcw, Check, SwitchCamera } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageData: string) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
    }
    return () => stopCamera();
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setIsSwitching(true);
    setError(null);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 } 
        },
        audio: false
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Please check permissions.");
    } finally {
      setTimeout(() => setIsSwitching(false), 500); // Animation delay
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Flip if user facing
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black flex flex-col">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/50 to-transparent">
        <button 
          onClick={onClose} 
          className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
        >
          <X size={24} />
        </button>
        <div className="flex gap-4">
          <button 
             onClick={toggleCamera} 
             disabled={!!capturedImage}
             className={`p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors ${capturedImage ? 'opacity-0' : 'opacity-100'}`}
          >
            <SwitchCamera size={24} />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
        {error ? (
          <div className="text-white text-center p-6">
            <p className="mb-4">{error}</p>
            <button onClick={onClose} className="px-4 py-2 bg-white text-black rounded-full font-bold">Close</button>
          </div>
        ) : (
          <>
             {capturedImage ? (
                <div className="w-full h-full flex items-center justify-center bg-black animate-fade-in">
                  <img 
                    src={capturedImage} 
                    alt="Captured" 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover transition-opacity duration-300 ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${isSwitching ? 'opacity-0' : 'opacity-100'}`}
                />
              )}
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-8 pb-10 bg-gradient-to-t from-black/80 to-transparent z-20 flex justify-center items-center gap-8 min-h-[140px]">
        {capturedImage ? (
          <>
            <button 
              onClick={handleRetake}
              className="flex flex-col items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <div className="p-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                <RotateCcw size={24} />
              </div>
              <span className="text-xs font-medium">Retake</span>
            </button>

            <button 
              onClick={handleConfirm}
              className="flex flex-col items-center gap-2 text-white hover:scale-105 transition-transform"
            >
              <div className="p-6 rounded-full bg-teal-500 text-white shadow-lg shadow-teal-500/40">
                <Check size={32} strokeWidth={3} />
              </div>
              <span className="text-xs font-bold">Use Photo</span>
            </button>
          </>
        ) : (
          <button 
            onClick={handleCapture}
            className="p-1 rounded-full border-4 border-white/30 hover:border-white/50 transition-colors hover:scale-105 active:scale-95"
          >
            <div className="w-16 h-16 bg-white rounded-full border-4 border-transparent"></div>
          </button>
        )}
      </div>
    </div>
  );
};
