import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, X, Camera, Loader2, Activity, UploadCloud, TrendingUp, Utensils, Droplet, AlertCircle, Settings, Clock, Plus, Lightbulb, Sun, ScanFace } from 'lucide-react';
import { CameraModal } from './CameraModal';

interface InputSectionProps {
  onAnalyze: (text: string, images: string[]) => void;
  isLoading: boolean;
  cooldown?: number; // Optional cooldown in seconds
  autoFocus?: boolean;
  onOpenSymptomTracker: () => void;
}

export const InputSection: React.FC<InputSectionProps> = ({ onAnalyze, isLoading, cooldown = 0, autoFocus = false, onOpenSymptomTracker }) => {
  const [text, setText] = useState('');
  const [inputMode, setInputMode] = useState<'General' | 'Food' | 'Skin'>('General');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  // Permission State
  const [micError, setMicError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [recognition, setRecognition] = useState<any>(null);

  // Auto-focus logic for new sessions
  useEffect(() => {
    if (autoFocus && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [autoFocus]);

  // Request Microphone Permission on Mount (Restore Original Behavior)
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        stream.getTracks().forEach(track => track.stop());
        setMicError(null);
      })
      .catch(err => {
        console.warn("Microphone permission denied on load", err);
        setMicError("Microphone access denied. Please check browser settings.");
      });
  }, []);

  // Idle timer for Analyze button animation
  useEffect(() => {
    const timer = setTimeout(() => setIsIdle(true), 5000);
    const resetIdle = () => {
      setIsIdle(false);
      clearTimeout(timer);
      setTimeout(() => setIsIdle(true), 5000);
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('touchstart', resetIdle);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('touchstart', resetIdle);
    };
  }, []);

  // Initialize Speech Recognition Object
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = false;
      recog.lang = 'en-US';
      
      recog.onresult = (event: any) => {
        let newTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            newTranscript += event.results[i][0].transcript;
          }
        }
        if (newTranscript) {
          setText((prev) => {
            const trimmedNew = newTranscript.trim();
            if (!trimmedNew) return prev;
            const spacer = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
            return prev + spacer + trimmedNew;
          });
        }
      };

      recog.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
            setMicError("Microphone access denied. Please check browser settings.");
        }
      };

      recog.onend = () => setIsListening(false);
      setRecognition(recog);
    }
  }, []);

  const handleImageUpload = (file: File) => {
    if (imagePreviews.length >= 3) {
      alert("You can upload a maximum of 3 images.");
      return;
    }
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string].slice(0, 3));
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please upload a valid JPG or PNG image.");
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        if (file instanceof File) {
          handleImageUpload(file);
        }
      });
    }
    // Reset input to allow re-selection of same file if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        if (file instanceof File) {
          handleImageUpload(file);
        }
      });
    }
  };

  const handleMicClick = () => {
    setMicError(null);
    if (!recognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    startListening();
  };

  const startListening = () => {
    try {
      recognition.start();
      setIsListening(true);
    } catch (err) {
      setIsListening(false);
    }
  };

  const handleSubmit = () => {
    if (!text && imagePreviews.length === 0) return;
    
    let promptToSend = text;
    
    if (inputMode === 'Food') {
      if (!promptToSend.trim()) {
        promptToSend = "Analyze the nutritional value, macro-nutrients, and estimated calories of this food.";
      } else {
        promptToSend = `Nutrition analysis for this meal: ${promptToSend}`;
      }
    } else if (inputMode === 'Skin') {
      if (!promptToSend.trim()) {
        promptToSend = "Analyze visible skin symptoms, identify potential concerns, and suggest a care routine.";
      } else {
        promptToSend = `Skin analysis request: ${promptToSend}`;
      }
    }
    
    onAnalyze(promptToSend, imagePreviews);
  };

  const removeImage = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const getButtonStyles = () => {
    if (isLoading) {
      return 'bg-gradient-to-r from-teal-400 via-emerald-300 to-teal-400 animate-gradient-x text-white cursor-wait shadow-lg border-teal-200 dark:border-teal-700';
    }
    if (cooldown > 0) {
      return 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border-transparent';
    }
    if (!text && imagePreviews.length === 0) {
      return 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border-transparent';
    }
    return 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 shadow-xl shadow-teal-500/20 text-white border-transparent';
  };

  const handleCameraCapture = (imageData: string) => {
    setImagePreviews(prev => [...prev, imageData].slice(0, 3));
  };

  const getPlaceholderText = () => {
    if (isListening) return "Listening...";
    if (inputMode === 'Food') return "Describe this meal...";
    if (inputMode === 'Skin') return "Describe symptoms...";
    return "💬 Ask a health question...";
  };

  const renderGuidance = () => {
    // Only show guidance for Skin or General health queries
    if (inputMode === 'Food') return null;
    if (imagePreviews.length >= 3) return null;

    return (
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-4 animate-fade-in mx-1">
        <div className="flex items-start gap-3">
          <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
            {inputMode === 'Skin' ? <ScanFace size={18} /> : <Lightbulb size={18} />}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-1">
              {imagePreviews.length === 0 ? "Photo Tips for Best Results" : "Add more detail?"}
            </h4>
            
            <div className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed space-y-1">
               {imagePreviews.length === 0 && (
                 <>
                   <p className="font-medium">You can add up to 3 photos for better clarity.</p>
                   {inputMode === 'Skin' ? (
                     <p className="opacity-90">Try capturing: <b>1. Front view</b> &bull; <b>2. Side angle</b> &bull; <b>3. Close-up</b></p>
                   ) : (
                     <p className="opacity-90">Clear, well-lit photos help the AI analyze symptoms more accurately.</p>
                   )}
                 </>
               )}
               {imagePreviews.length === 1 && (
                 <p>Great start. Multiple angles may help improve analysis accuracy. Try adding a side view or close-up.</p>
               )}
               {imagePreviews.length === 2 && (
                 <p>Almost done. You can add one last photo (like a close-up or different angle) if needed.</p>
               )}
            </div>

            {imagePreviews.length === 0 && (
              <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-indigo-100 dark:border-indigo-900/30 text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide">
                 <span className="flex items-center gap-1"><Sun size={10} /> Natural Light</span>
                 <span className="flex items-center gap-1"><Camera size={10} /> No Filters</span>
                 <span className="flex items-center gap-1"><Activity size={10} /> Steady Cam</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`w-full max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl shadow-teal-100/50 dark:shadow-none border overflow-hidden transition-all duration-300 
        ${isDragging 
          ? 'border-teal-400 ring-4 ring-teal-50 dark:ring-teal-900/30 scale-[1.01]' 
          : 'border-white dark:border-slate-700'
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-6 md:p-8 space-y-6">
        
        {/* Input Type Selector */}
        <div className="flex justify-center">
          <div className="bg-gray-100 dark:bg-slate-700 p-1.5 rounded-xl flex gap-1 items-center overflow-x-auto max-w-full">
            <button 
              onClick={() => setInputMode('General')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                inputMode === 'General' 
                  ? 'bg-white dark:bg-slate-600 text-teal-700 dark:text-teal-400 shadow-sm ring-1 ring-gray-200 dark:ring-slate-500' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-slate-600/50'
              }`}
            >
              <Activity size={16} />
              <span>General</span>
            </button>
            <button 
              onClick={() => setInputMode('Food')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                inputMode === 'Food' 
                  ? 'bg-white dark:bg-slate-600 text-green-700 dark:text-green-400 shadow-sm ring-1 ring-gray-200 dark:ring-slate-500' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-slate-600/50'
              }`}
            >
              <Utensils size={16} />
              <span>Food</span>
            </button>
            <button 
              onClick={() => setInputMode('Skin')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                inputMode === 'Skin' 
                  ? 'bg-white dark:bg-slate-600 text-blue-700 dark:text-blue-400 shadow-sm ring-1 ring-gray-200 dark:ring-slate-500' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-slate-600/50'
              }`}
            >
              <Droplet size={16} />
              <span>Skin</span>
            </button>
          </div>
        </div>
        
        {/* Assistive Image Guidance */}
        {renderGuidance()}
        
        {/* Image Input Area */}
        {imagePreviews.length > 0 ? (
          <div className="relative w-full h-64 bg-gray-50 dark:bg-slate-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-700 group shadow-inner flex">
             <div className={`w-full h-full grid gap-1 p-1 ${imagePreviews.length === 1 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative w-full h-full rounded-2xl overflow-hidden bg-black/5 dark:bg-black/20 group/img">
                    <img src={preview} alt={`Upload ${idx+1}`} className="w-full h-full object-cover" />
                    <button 
                       onClick={(e) => removeImage(e, idx)}
                       className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover/img:opacity-100 backdrop-blur-sm"
                       title="Remove image"
                    >
                       <X size={14} />
                    </button>
                  </div>
                ))}
                
                {imagePreviews.length < 3 && (
                   <div className="flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-800 border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-2xl transition-colors group/add">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500">Add Image</span>
                      <div className="flex gap-2 sm:gap-3">
                        <button 
                          onClick={() => setIsCameraOpen(true)}
                          className="p-3 bg-gray-100 dark:bg-slate-700 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/30 text-gray-400 hover:text-teal-500 transition-colors"
                          title="Capture"
                        >
                          <Camera size={20} />
                        </button>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="p-3 bg-gray-100 dark:bg-slate-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-500 transition-colors"
                          title="Upload"
                        >
                          <UploadCloud size={20} />
                        </button>
                      </div>
                   </div>
                )}
             </div>
          </div>
        ) : (
          <div 
            className={`w-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all p-8 gap-6
              ${isDragging 
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' 
                : 'border-teal-100 dark:border-slate-700 bg-teal-50/30 dark:bg-slate-900/50'
              }`}
          >
            <div className="flex flex-row gap-4 w-full justify-center">
              {/* Capture Button */}
              <button
                onClick={() => setIsCameraOpen(true)}
                className="flex-1 max-w-[160px] flex flex-col items-center gap-2 p-4 rounded-2xl bg-white dark:bg-slate-700 border border-teal-100 dark:border-slate-600 shadow-sm hover:shadow-md hover:border-teal-300 dark:hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-slate-600 transition-all group"
                aria-label="Capture Photo"
              >
                <div className="p-3 bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Camera size={24} />
                </div>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Capture</span>
              </button>

              {/* Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 max-w-[160px] flex flex-col items-center gap-2 p-4 rounded-2xl bg-white dark:bg-slate-700 border border-teal-100 dark:border-slate-600 shadow-sm hover:shadow-md hover:border-teal-300 dark:hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-slate-600 transition-all group"
              >
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
                  <UploadCloud size={24} />
                </div>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Upload</span>
              </button>
            </div>

            <div className="text-center">
              <span className="text-xs text-teal-400 font-medium block mb-1">
                {isDragging ? 'Drop images now!' : 'Or drag and drop images here'}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                JPG, PNG supported (Max 3)
              </span>
            </div>
          </div>
        )}

        {/* Hidden File Input */}
        <input 
          id="file-upload-trigger"
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/png, image/jpeg, image/jpg" 
          multiple // Enable multiple selection
          onChange={onFileInputChange}
        />

        {/* Text Input Area */}
        <div 
          onClick={() => textInputRef.current?.focus()}
          className={`relative flex flex-col bg-gray-50 dark:bg-slate-900 rounded-2xl border transition-all cursor-text py-1 px-1
            ${isListening 
              ? 'border-red-400 ring-4 ring-red-50 dark:ring-red-900/30' 
              : 'border-gray-100 dark:border-slate-700 focus-within:ring-4 focus-within:ring-teal-50 dark:focus-within:ring-teal-900/20 focus-within:border-teal-300 dark:focus-within:border-teal-700'
            }`}
        >
          <div className="flex items-center w-full">
            <input
              ref={textInputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={getPlaceholderText()}
              className="flex-1 bg-transparent p-4 pl-5 outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 text-base"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleMicClick();
              }}
              title={isListening ? "Stop Recording" : "Voice Input"}
              aria-label="Voice Input"
              className={`p-3 mr-1 rounded-xl transition-all duration-200 flex items-center justify-center ${
                isListening 
                  ? 'bg-red-500 text-white shadow-md hover:bg-red-600 scale-105' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm'
              }`}
            >
              {isListening ? (
                <Square size={20} fill="currentColor" className="animate-pulse" />
              ) : (
                <Mic size={22} />
              )}
            </button>
          </div>
          {micError && (
             <div className="px-5 pb-2 flex items-center gap-1.5 text-xs text-red-500 font-medium animate-fade-in">
               <AlertCircle size={12} />
               {micError}
               <span className="text-gray-400 flex items-center gap-1 ml-1 cursor-help" title="Go to browser settings to allow microphone access">
                 <Settings size={10} /> Check settings
               </span>
             </div>
          )}
        </div>

        {/* Two-Button Action Area */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSubmit}
            disabled={isLoading || cooldown > 0 || (!text && imagePreviews.length === 0)}
            className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-lg tracking-wide transition-all transform border
              ${getButtonStyles()}
              ${!isLoading && !cooldown && text && isIdle ? 'animate-bounce-subtle' : ''}
              ${!isLoading && !cooldown ? 'active:scale-[0.98]' : ''}
              `}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                Analyzing...
              </>
            ) : cooldown > 0 ? (
              <>
                <Clock size={24} className="animate-pulse" />
                Wait {cooldown}s...
              </>
            ) : (
              <>
                <Activity size={24} strokeWidth={2.5} />
                Analyze
              </>
            )}
          </button>

          <button
            onClick={onOpenSymptomTracker}
            disabled={isLoading}
            className="sm:w-1/3 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-lg tracking-wide transition-all transform active:scale-[0.98] border border-teal-100 dark:border-slate-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrendingUp size={24} strokeWidth={2.5} />
            <span className="hidden sm:inline">Tracker</span>
            <span className="sm:hidden">Symptom Tracker</span>
          </button>
        </div>
      </div>

      {/* Camera Modal (Handles its own permission logic) */}
      <CameraModal 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={handleCameraCapture} 
      />
    </div>
  );
};
