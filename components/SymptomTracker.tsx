
import React, { useState, useMemo, useEffect } from 'react';
import { HistoryItem } from '../types';
import { ComparisonSlider } from './ComparisonSlider';
import { TrendingUp, Activity, X, ArrowRight, Trash2, AlertCircle, Camera } from 'lucide-react';

interface SymptomTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onClear: () => void;
}

export const SymptomTracker: React.FC<SymptomTrackerProps> = ({ isOpen, onClose, history, onClear }) => {
  // BEHAVIOR RULE 5: MANUAL COMPARISONS (Any two entries)
  // Store IDs of selected items (up to 2)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter only skincare items with images, sorted CHRONOLOGICALLY (Oldest first)
  // BEHAVIOR RULE 3: SEQUENTIAL RECORDING (Derived from timestamp)
  const skinHistory = useMemo(() => {
    return history
      .filter(item => item.result.category === 'Skincare' && item.imageUrl)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [history]);

  // BEHAVIOR RULE 5 & 3c: DEFAULT COMPARISON PAIRING RULE
  // When tracker opens and we have >= 2 entries, select the last two.
  useEffect(() => {
    if (isOpen && skinHistory.length >= 2) {
      const last = skinHistory[skinHistory.length - 1];
      const prev = skinHistory[skinHistory.length - 2];
      // Set default selection: [Before, After]
      setSelectedIds([prev.id, last.id]);
    } else {
      setSelectedIds([]);
    }
  }, [isOpen, skinHistory.length]); // Depend on length so if a new item is added while open, we could technically update, but requirement says "When opened"

  if (!isOpen) return null;

  // Helper to extract severity (1=Mild, 2=Moderate, 3=Severe)
  const getSeverity = (item: HistoryItem): { score: number; label: string; color: string } => {
    const text = JSON.stringify(item.result.cards).toLowerCase();
    if (text.includes('severe')) return { score: 3, label: 'Severe', color: 'text-red-500 bg-red-50 border-red-100' };
    if (text.includes('moderate')) return { score: 2, label: 'Moderate', color: 'text-orange-500 bg-orange-50 border-orange-100' };
    return { score: 1, label: 'Mild', color: 'text-green-500 bg-green-50 border-green-100' };
  };

  // BEHAVIOR RULE 6: GRAPH / TRENDING
  // X-axis: Submission index (1, 2, 3...)
  const trendData = skinHistory.map((item, index) => ({
    entryLabel: `Entry ${index + 1}`,
    date: new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    ...getSeverity(item),
    id: item.id
  }));

  const handleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(itemId => itemId !== id));
    } else {
      if (selectedIds.length < 2) {
        setSelectedIds(prev => [...prev, id]);
      } else {
        // If 2 already selected, replace the older selection (simple FIFO for UX) or just reset to latest click + previous
        // Let's replace the first one to allow "moving forward"
        setSelectedIds([selectedIds[1], id]);
      }
    }
  };

  // Determine comparison items based on selection
  const comparisonItems = selectedIds.length === 2 
    ? skinHistory.filter(item => selectedIds.includes(item.id))
    : null;

  const clearSelection = () => setSelectedIds([]);

  // Simple SVG Graph Generation
  const renderGraph = () => {
    if (trendData.length < 2) return null;
    
    const height = 80;
    const width = 100;
    const padding = 5;
    
    const points = trendData.map((d, i) => {
      const x = (i / (trendData.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((d.score - 0.5) / 3) * height; 
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="w-full h-32 relative mt-2 mb-6 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Severity Trend</h4>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
          {/* Reference Lines */}
          <line x1="0" y1={height * 0.1} x2="100" y2={height * 0.1} stroke="#fecaca" strokeWidth="0.5" strokeDasharray="2" opacity="0.5" />
          <line x1="0" y1={height * 0.5} x2="100" y2={height * 0.5} stroke="#fed7aa" strokeWidth="0.5" strokeDasharray="2" opacity="0.5" />
          <line x1="0" y1={height * 0.9} x2="100" y2={height * 0.9} stroke="#bbf7d0" strokeWidth="0.5" strokeDasharray="2" opacity="0.5" />
          
          <polyline 
            points={points} 
            fill="none" 
            stroke="url(#gradient-line)" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          
          <defs>
            <linearGradient id="gradient-line" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>

          {trendData.map((d, i) => {
            const x = (i / (trendData.length - 1)) * (width - padding * 2) + padding;
            const y = height - ((d.score - 0.5) / 3) * height;
            const isSelected = selectedIds.includes(d.id);
            return (
              <circle 
                key={i} 
                cx={x} 
                cy={y} 
                r={isSelected ? "4" : "2.5"}
                className={`${isSelected ? 'fill-teal-500 stroke-white stroke-[1.5]' : 'fill-white stroke-teal-400 stroke-[1]'} transition-all duration-300 cursor-pointer`}
                vectorEffect="non-scaling-stroke"
                onClick={() => handleSelection(d.id)}
              />
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
       {/* Backdrop */}
       <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Modal Panel */}
      <div 
        className="bg-white w-full max-w-4xl h-[90vh] rounded-[32px] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-fade-in-scale"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tracker-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
               <TrendingUp size={24} />
             </div>
             <div>
               <h2 id="tracker-title" className="text-xl font-bold text-gray-900">Symptom Tracker</h2>
               <p className="text-xs text-gray-500 font-medium">Session History ({skinHistory.length} scans)</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-gray-50/50">
          
          {skinHistory.length === 0 ? (
             // Should theoretically not happen if button is hidden, but safe fallback
             <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                <AlertCircle size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">No history available yet.</p>
             </div>
          ) : skinHistory.length === 1 ? (
             // BEHAVIOR RULE 3b: Single Entry State
             <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <div className="relative mb-8">
                  <img 
                    src={skinHistory[0].imageUrl} 
                    alt="First Scan" 
                    className="w-48 h-48 object-cover rounded-3xl shadow-xl rotate-3 border-4 border-white"
                  />
                  <div className="absolute -top-4 -right-4 bg-teal-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-white shadow-md">
                    1
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">One scan recorded</h3>
                <p className="text-gray-500 leading-relaxed mb-8">
                  Great start! Upload another skin image to unlock the comparison slider and track your progress over time.
                </p>
                <button 
                  onClick={onClose}
                  className="flex items-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 hover:scale-[1.02]"
                >
                  <Camera size={20} />
                  Capture New Scan
                </button>
             </div>
          ) : (
            // BEHAVIOR RULE 3c & 3d: Comparison View
            <div className="space-y-6">
              
              {/* Comparison Slider Section */}
              <div className="bg-white rounded-3xl p-1 shadow-sm border border-gray-100 overflow-hidden">
                 {comparisonItems && comparisonItems.length === 2 ? (
                   <div className="relative aspect-[4/3] md:aspect-[16/9] bg-gray-100 rounded-[20px] overflow-hidden">
                     {/* Ensure chronological order for Before/After */}
                     <ComparisonSlider 
                       beforeImage={comparisonItems.sort((a,b) => a.timestamp - b.timestamp)[0].imageUrl!} 
                       afterImage={comparisonItems.sort((a,b) => a.timestamp - b.timestamp)[1].imageUrl!}
                       beforeLabel={`Scan #${skinHistory.indexOf(comparisonItems.sort((a,b) => a.timestamp - b.timestamp)[0]) + 1}`}
                       afterLabel={`Scan #${skinHistory.indexOf(comparisonItems.sort((a,b) => a.timestamp - b.timestamp)[1]) + 1}`}
                     />
                     <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                        <span className="bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium border border-white/20">
                           Comparing Entry {skinHistory.indexOf(comparisonItems[0]) + 1} vs {skinHistory.indexOf(comparisonItems[1]) + 1}
                        </span>
                     </div>
                   </div>
                 ) : (
                   <div className="aspect-[16/9] flex items-center justify-center bg-gray-50 text-gray-400 rounded-[20px] border-2 border-dashed border-gray-100">
                      <p>Select any two scans below to compare</p>
                   </div>
                 )}
              </div>

              {/* Trend Graph */}
              {renderGraph()}

              {/* Carousel Selection */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                   <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Timeline Selection</h4>
                   {selectedIds.length > 0 && (
                     <button onClick={clearSelection} className="text-[10px] font-bold text-teal-600 hover:text-teal-700 bg-teal-50 px-2 py-1 rounded-md">
                       Reset Selection
                     </button>
                   )}
                </div>
                <div className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x scrollbar-hide px-1">
                  {skinHistory.map((item, index) => {
                    const severity = getSeverity(item);
                    const isSelected = selectedIds.includes(item.id);
                    const selectionIndex = selectedIds.indexOf(item.id); // 0 or 1

                    return (
                      <div 
                        key={item.id}
                        onClick={() => handleSelection(item.id)}
                        className={`snap-center flex-shrink-0 w-32 md:w-40 bg-white rounded-2xl p-2.5 border-2 transition-all cursor-pointer group relative shadow-sm
                          ${isSelected ? 'border-teal-500 shadow-teal-500/20 scale-[0.98]' : 'border-transparent hover:border-gray-200'}
                        `}
                      >
                        <div className="aspect-square rounded-xl overflow-hidden mb-3 relative bg-gray-100">
                          <img src={item.imageUrl} alt="scan" className="w-full h-full object-cover" />
                          <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold backdrop-blur-sm">
                            #{index + 1}
                          </div>
                          {isSelected && (
                            <div className="absolute inset-0 bg-teal-500/20 flex items-center justify-center backdrop-blur-[1px] transition-all">
                              <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center text-teal-600 font-bold shadow-md scale-100 animate-fade-in-scale">
                                {selectionIndex === 0 ? "A" : "B"}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className={`text-[10px] font-bold px-2 py-1 rounded-lg w-full text-center mb-1.5 border ${severity.color}`}>
                          {severity.label}
                        </div>
                        
                        <div className="text-[10px] font-semibold text-gray-400 text-center">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center flex-shrink-0">
           {/* BEHAVIOR RULE 8: Clear Tracker Control */}
           <button 
             onClick={() => {
               if(window.confirm("Clear all symptom tracker history for this session?")) {
                 onClear();
               }
             }}
             className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium"
           >
             <Trash2 size={16} />
             Clear Tracker
           </button>

           <button 
             onClick={onClose}
             className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all text-sm"
           >
             Done
           </button>
        </div>
      </div>
    </div>
  );
};
