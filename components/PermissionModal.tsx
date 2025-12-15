
import React from 'react';
import { Camera, Mic, X, Shield, Settings } from 'lucide-react';

interface PermissionModalProps {
  isOpen: boolean;
  type: 'camera' | 'microphone';
  onAllow: () => void;
  onCancel: () => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({ isOpen, type, onAllow, onCancel }) => {
  if (!isOpen) return null;

  const isCamera = type === 'camera';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={onCancel} />
       <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm relative z-10 p-6 animate-fade-in-scale border border-gray-100 dark:border-slate-800">
          <button onClick={onCancel} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>

          <div className="flex flex-col items-center text-center gap-4 pt-2">
             <div className={`p-4 rounded-full ${isCamera ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                {isCamera ? <Camera size={32} /> : <Mic size={32} />}
             </div>
             
             <h3 className="text-xl font-bold text-gray-900 dark:text-white">
               {isCamera ? "Camera Access Needed" : "Microphone Access Needed"}
             </h3>
             
             <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
               {isCamera 
                 ? "LifeLens needs camera access to capture your photo. Images are processed safely and never accessed without your action."
                 : "Microphone access helps you ask a question using your voice. Audio is used only when you tap the mic."
               }
             </p>

             <div className="w-full space-y-3 mt-4">
               <button 
                 onClick={onAllow}
                 className="w-full py-3.5 rounded-xl font-bold text-white bg-teal-500 hover:bg-teal-600 shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-all"
               >
                 Allow Access
               </button>
               <button 
                 onClick={onCancel}
                 className="w-full py-3.5 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
               >
                 Not Now
               </button>
             </div>

             <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-2">
               <Shield size={12} />
               <span>Privacy protected</span>
             </div>
          </div>
       </div>
    </div>
  );
};
