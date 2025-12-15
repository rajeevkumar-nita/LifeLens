
import React, { useState } from 'react';
import { 
  AlertOctagon, Info, ChevronDown, ChevronUp, RefreshCw, CheckCircle2, Sparkles, Loader2 
} from 'lucide-react';
import { AnalysisResult } from '../types';

interface TriggerCardProps {
  currentResult: AnalysisResult | null;
  selectedTriggers: string[];
  suggestions?: string | null;
  onToggleTrigger: (trigger: string) => void;
  onRefine: () => void;
  isLoading: boolean;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

const PREDEFINED_TRIGGERS = [
  { id: 'Diet: Dairy', label: 'Dairy', tooltip: 'Dairy can sometimes exacerbate acne or inflammation.' },
  { id: 'Diet: High Sugar', label: 'High Sugar', tooltip: 'Sugar spikes insulin which may increase oil production.' },
  { id: 'Diet: Oily Food', label: 'Oily Food', tooltip: 'Greasy foods might contribute to skin issues for some.' },
  { id: 'Hydration: Low Water', label: 'Low Water', tooltip: 'Dehydration can lead to dull or dry skin.' },
  { id: 'Sleep: Poor/Irregular', label: 'Poor Sleep', tooltip: 'Lack of sleep increases cortisol, worsening inflammation.' },
  { id: 'Stress: High', label: 'High Stress', tooltip: 'Stress hormones often trigger breakouts or flare-ups.' },
  { id: 'Skincare: New Product', label: 'New Product', tooltip: 'New ingredients can cause purging or irritation.' },
  { id: 'Hygiene: Pillowcase/Phone', label: 'Hygiene', tooltip: 'Bacteria on surfaces touching face can cause issues.' },
  { id: 'Hormonal: Cycle', label: 'Hormonal', tooltip: 'Cyclical changes often cause chin/jawline breakouts.' },
];

export const TriggerCard: React.FC<TriggerCardProps> = ({
  currentResult,
  selectedTriggers,
  suggestions,
  onToggleTrigger,
  onRefine,
  isLoading,
  isVisible,
  onToggleVisibility
}) => {
  const [otherTrigger, setOtherTrigger] = useState('');

  if (!currentResult || (currentResult.category !== 'Skincare' && currentResult.category !== 'General')) return null;

  // Check for low confidence in suggestions or main result
  const isLowConfidence = suggestions?.toLowerCase().includes('provisional') || 
    currentResult.cards.some(c => c.content.toLowerCase().includes('confidence: low'));

  const handleAddOther = () => {
    if (otherTrigger.trim()) {
      onToggleTrigger(`Other: ${otherTrigger.trim()}`);
      setOtherTrigger('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddOther();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 mb-8">
      <div className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-300 overflow-hidden ${isVisible ? 'shadow-lg border-teal-100 dark:border-teal-900/50' : 'shadow-sm border-gray-100 dark:border-slate-700'}`}>
        
        {/* Header (Always Visible) */}
        <div 
          onClick={onToggleVisibility}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          <div className="flex items-center gap-3">
             <div className="bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 p-2 rounded-xl">
               <AlertOctagon size={20} />
             </div>
             <div>
               <h3 className="font-bold text-gray-800 dark:text-white text-sm sm:text-base">Possible Triggers</h3>
               {!isVisible && (
                 <p className="text-xs text-gray-500 dark:text-gray-400">Tap to refine advice based on lifestyle factors</p>
               )}
             </div>
          </div>
          <button className="text-gray-400 dark:text-gray-500">
            {isVisible ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {/* Content (Collapsible) */}
        {isVisible && (
          <div className="p-5 pt-0 animate-fade-in">
            {/* AI Suggestions Block */}
            {suggestions ? (
               <div className="mb-6 p-4 bg-teal-50/50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-900/30">
                  <h4 className="flex items-center gap-2 text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-2">
                    <Sparkles size={14} /> AI Suggestions
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {suggestions}
                  </p>
               </div>
            ) : (
               <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-700 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 size={16} className="animate-spin" /> Analyzing possible triggers...
               </div>
            )}

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed font-medium">
              Select any factors that apply to you to get refined advice:
            </p>

            {/* Chips Grid */}
            <div className="flex flex-wrap gap-2 mb-4">
              {PREDEFINED_TRIGGERS.map((trigger) => {
                const isSelected = selectedTriggers.includes(trigger.id);
                return (
                  <div key={trigger.id} className="relative group">
                    <button
                      onClick={() => onToggleTrigger(trigger.id)}
                      className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center gap-2
                        ${isSelected 
                          ? 'bg-teal-500 text-white border-teal-500 shadow-md shadow-teal-500/20' 
                          : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600 hover:border-teal-300 dark:hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400'
                        }`}
                    >
                      {trigger.label}
                      {isSelected && <CheckCircle2 size={14} />}
                    </button>
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 dark:bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 text-center leading-tight border dark:border-slate-700 shadow-xl">
                      {trigger.tooltip}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800 dark:border-t-slate-900"></div>
                    </div>
                  </div>
                );
              })}
              
              {/* Custom Triggers Display */}
              {selectedTriggers.filter(t => t.startsWith('Other:')).map((t) => (
                 <button
                   key={t}
                   onClick={() => onToggleTrigger(t)}
                   className="px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border bg-teal-500 text-white border-teal-500 shadow-md shadow-teal-500/20 flex items-center gap-2"
                 >
                   {t.replace('Other: ', '')}
                   <CheckCircle2 size={14} />
                 </button>
              ))}
            </div>

            {/* Other Input */}
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={otherTrigger}
                onChange={(e) => setOtherTrigger(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Other triggers (optional)..."
                className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-900/30 focus:border-teal-300 dark:focus:border-teal-700 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <button 
                onClick={handleAddOther}
                disabled={!otherTrigger.trim()}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
              >
                Add
              </button>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-slate-700">
              
              {isLowConfidence && (
                 <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-lg">
                   <Info size={14} />
                   <span>Image unclear — suggestions provisional.</span>
                 </div>
              )}

              <button
                onClick={onRefine}
                disabled={isLoading || selectedTriggers.length === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-slate-700 text-white font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-gray-200 dark:shadow-none ml-auto"
              >
                {isLoading ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <RefreshCw size={18} />
                )}
                Refine Advice
              </button>
            </div>

             <div className="mt-4 text-[10px] text-center text-gray-400 dark:text-gray-500">
               I am an AI assistant, not a medical professional. Please consult a doctor for medical advice.
             </div>

          </div>
        )}
      </div>
    </div>
  );
};
