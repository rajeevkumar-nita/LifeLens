
import React, { useEffect, useRef } from 'react';
import { MessageSquarePlus } from 'lucide-react';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap for accessibility
  useEffect(() => {
    if (isOpen) {
      confirmButtonRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div 
        className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-sm relative z-10 overflow-hidden animate-fade-in-scale border border-gray-100 dark:border-slate-800"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="new-chat-title"
        aria-describedby="new-chat-desc"
      >
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-teal-100 dark:border-teal-900/50">
            <MessageSquarePlus size={32} />
          </div>
          <h2 id="new-chat-title" className="text-xl font-bold text-gray-900 dark:text-white mb-2">Start a new chat?</h2>
          <p id="new-chat-desc" className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
            This will clear the current session's scans and history. This action cannot be undone.
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              ref={confirmButtonRef}
              onClick={onConfirm}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-teal-500/20 active:scale-[0.98] outline-none focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/50"
            >
              Start New Chat
            </button>
            <button
              onClick={onClose}
              className="w-full py-3.5 px-4 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 font-bold rounded-2xl transition-colors border border-gray-100 dark:border-slate-700 outline-none focus:ring-4 focus:ring-gray-100 dark:focus:ring-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
