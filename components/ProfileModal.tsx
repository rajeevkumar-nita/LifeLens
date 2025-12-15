
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { clearAnalysisCache } from '../services/cacheService';
import { X, Save, AlertCircle, FileText, Heart, ShieldAlert, User, Database, Check, Sun, Moon } from 'lucide-react';
import { Theme } from '../hooks/useTheme';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  theme?: Theme;
  toggleTheme?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, profile, onSave, theme, toggleTheme }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(profile);
      setCacheCleared(false);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSave = () => {
    setIsSaving(true);
    // Simulate a small delay for better UX
    setTimeout(() => {
      onSave(formData);
      setIsSaving(false);
      onClose();
    }, 400);
  };

  const handleClearCache = () => {
    if (window.confirm("Clear all locally cached analysis results? This will not affect your saved history.")) {
      clearAnalysisCache();
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-fade-in-scale flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 dark:bg-teal-900/30 p-2.5 rounded-xl text-teal-600 dark:text-teal-400">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Medical Profile</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Personalize your AI insights</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-400"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 flex gap-3 text-blue-700 dark:text-blue-300">
            <AlertCircle className="flex-shrink-0" size={20} />
            <p className="text-sm leading-relaxed">
              This information is stored locally on your device and used to check for allergens or contraindications in your analysis.
            </p>
          </div>

          {/* Conditions */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">
              <Heart size={16} className="text-rose-500" />
              Medical Conditions
            </label>
            <textarea
              value={formData.conditions}
              onChange={(e) => setFormData(prev => ({ ...prev, conditions: e.target.value }))}
              placeholder="e.g., Asthma, Type 2 Diabetes, Hypertension..."
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 focus:ring-4 focus:ring-teal-50 dark:focus:ring-teal-900/30 focus:border-teal-400 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 min-h-[80px] text-gray-700 dark:text-gray-200 resize-none"
            />
          </div>

          <div className="h-px w-full bg-gray-100 dark:bg-slate-800" />

          {/* Allergies */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">
              <ShieldAlert size={16} className="text-orange-500" />
              Allergies & Sensitivities
            </label>
            <textarea
              value={formData.allergies}
              onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
              placeholder="e.g., Peanuts, Penicillin, Latex, Dairy..."
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 focus:ring-4 focus:ring-teal-50 dark:focus:ring-teal-900/30 focus:border-teal-400 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 min-h-[80px] text-gray-700 dark:text-gray-200 resize-none"
            />
          </div>

          <div className="h-px w-full bg-gray-100 dark:bg-slate-800" />

          {/* History / Treatments */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">
              <FileText size={16} className="text-gray-500 dark:text-gray-400" />
              Past History & Treatments
            </label>
            <textarea
              value={formData.history}
              onChange={(e) => setFormData(prev => ({ ...prev, history: e.target.value }))}
              placeholder="e.g., Appendectomy (2018), Currently taking Metformin..."
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 focus:ring-4 focus:ring-teal-50 dark:focus:ring-teal-900/30 focus:border-teal-400 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 min-h-[80px] text-gray-700 dark:text-gray-200 resize-none"
            />
          </div>

          <div className="h-px w-full bg-gray-100 dark:bg-slate-800" />
          
          {/* Settings Section */}
          <div className="space-y-4">
             <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">App Settings</h3>
             
             {/* Theme Toggle */}
             {toggleTheme && (
               <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                      <span className="text-sm font-medium">App Theme</span>
                  </div>
                  <button 
                    onClick={toggleTheme}
                    className="text-xs font-bold px-4 py-2 rounded-lg border transition-all flex items-center gap-1.5 bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200"
                  >
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </button>
               </div>
             )}

             {/* Cache Management */}
             <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                   <Database size={16} />
                   <span className="text-sm font-medium">Storage & Cache</span>
                </div>
                <button 
                  onClick={handleClearCache}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5
                    ${cacheCleared 
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' 
                      : 'bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-600 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900'
                    }`}
                >
                  {cacheCleared ? <Check size={12} /> : null}
                  {cacheCleared ? 'Cleared' : 'Clear Cache'}
                </button>
             </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex justify-end flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-teal-500/20 hover:from-teal-600 hover:to-emerald-600 transform hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : (
              <>
                <Save size={18} />
                Save Profile
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
