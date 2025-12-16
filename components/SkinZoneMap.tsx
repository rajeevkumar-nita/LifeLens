import React, { useState, useEffect, useRef } from 'react';
import { ZoneAnalysisResult, ZoneInsight } from '../types';
import { generateZoneInsights } from '../services/geminiService';
import { ScanFace, Info, X, ChevronRight, AlertCircle, Loader2, ArrowRightLeft, Sparkles, Camera, ShieldAlert } from 'lucide-react';

interface SkinZoneMapProps {
  image: string;
  facts: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SkinZoneMap: React.FC<SkinZoneMapProps> = ({ image, facts, isOpen, onClose }) => {
  const [data, setData] = useState<ZoneAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  
  const imgRef = useRef<HTMLImageElement>(null);

  // Fetch zone data when opened
  useEffect(() => {
    if (isOpen && !data && !loading) {
      setLoading(true);
      generateZoneInsights(image, facts)
        .then(res => {
          setData(res);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError("Could not map skin zones. Ensure face is clearly visible.");
          setLoading(false);
        });
    }
  }, [isOpen, image, facts]);

  if (!isOpen) return null;

  const selectedZone = data?.zones.find(z => z.id === selectedZoneId);
  const isValidAnalysis = data?.isValid;

  // Helper to convert 0-1000 scale to percentage
  const getStyle = (box: [number, number, number, number]) => {
    const [ymin, xmin, ymax, xmax] = box;
    return {
      top: `${ymin / 10}%`,
      left: `${xmin / 10}%`,
      height: `${(ymax - ymin) / 10}%`,
      width: `${(xmax - xmin) / 10}%`,
    };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'bg-red-500/30 border-red-400 text-red-100';
      case 'Medium': return 'bg-orange-500/30 border-orange-400 text-orange-100';
      default: return 'bg-teal-500/30 border-teal-400 text-teal-100';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      case 'Medium': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
      default: return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/50 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl transition-colors duration-300 ${isValidAnalysis === false ? 'bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
              <ScanFace size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white transition-colors duration-300">Skin Zone Map</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">
                {isValidAnalysis === false ? "Analysis unavailable" : "Tap regions for lifestyle insights"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-500 dark:text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row">
          
          {/* Visual Map Area */}
          <div className="relative w-full md:w-1/2 bg-gray-900 aspect-[4/5] md:aspect-square flex items-center justify-center overflow-hidden group select-none">
            {loading ? (
              <div className="flex flex-col items-center gap-4 text-white/80">
                <Loader2 size={32} className="animate-spin text-indigo-400" />
                <span className="text-sm font-medium">Scanning facial zones...</span>
              </div>
            ) : error ? (
              <div className="text-center p-6 text-white/80 max-w-xs">
                <AlertCircle size={32} className="mx-auto mb-2 text-red-400" />
                <p className="text-sm">{error}</p>
              </div>
            ) : isValidAnalysis === false ? (
               /* INVALID IMAGE STATE - VISUAL */
               <>
                 <img 
                   src={image} 
                   alt="Face Map" 
                   className="w-full h-full object-cover opacity-40 blur-[2px]"
                 />
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 border border-red-500/50 backdrop-blur-md">
                       <ShieldAlert size={32} className="text-red-200" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">Zone Map Unavailable</h3>
                    <p className="text-white/70 text-sm">{data?.errorReason || "Face not clearly visible"}</p>
                 </div>
               </>
            ) : (
              /* VALID MAP STATE */
              <>
                <img 
                  ref={imgRef}
                  src={image} 
                  alt="Face Map" 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity duration-500"
                />
                
                {/* Overlay Zones */}
                {data?.zones.map((zone) => (
                  <div
                    key={zone.id}
                    onClick={() => setSelectedZoneId(zone.id)}
                    className={`absolute border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-white hover:scale-[1.02] backdrop-blur-[1px]
                      ${selectedZoneId === zone.id ? 'bg-white/20 border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] z-10' : getSeverityColor(zone.severity)}
                    `}
                    style={getStyle(zone.box_2d)}
                  >
                    {/* Floating Label (Visible on Hover/Select) */}
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap opacity-0 transition-opacity pointer-events-none
                       ${selectedZoneId === zone.id ? 'opacity-100' : 'group-hover:opacity-100'}
                    `}>
                      {zone.label}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Hint Overlay (Only for valid state) */}
            {!loading && !error && isValidAnalysis !== false && !selectedZoneId && (
               <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
                 <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md">
                   Tap any highlighted zone
                 </span>
               </div>
            )}
          </div>

          {/* Insights Panel */}
          <div className="flex-1 p-6 bg-white dark:bg-slate-800 flex flex-col min-h-[300px] transition-colors duration-300">
            {isValidAnalysis === false ? (
               /* INVALID IMAGE STATE - INFO PANEL */
               <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <h4 className="text-gray-900 dark:text-white font-bold text-lg mb-4">Detection Tips</h4>
                  
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-xl p-4 text-left w-full mb-6">
                    <div className="flex gap-3">
                       <AlertCircle size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
                       <div className="text-sm text-orange-800 dark:text-orange-200 leading-relaxed">
                         {data?.overall_summary || "We couldn't clearly detect a face in this image. Please try a clearer, front-facing photo."}
                       </div>
                    </div>
                  </div>

                  <div className="w-full text-left space-y-3">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">For best results:</p>
                     <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-teal-500 rounded-full" /> Use bright, even lighting</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-teal-500 rounded-full" /> Face straight towards camera</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-teal-500 rounded-full" /> Remove hair covering face</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-teal-500 rounded-full" /> Avoid blurry or dark shots</li>
                     </ul>
                  </div>
               </div>
            ) : selectedZone ? (
              <div className="flex-1 animate-fade-in-scale">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xl font-bold text-gray-800 dark:text-white">{selectedZone.label}</h4>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${getSeverityBadge(selectedZone.severity)}`}>
                    {selectedZone.severity} Severity
                  </span>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-700 transition-colors duration-300">
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Observation</span>
                    <p className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                      {selectedZone.findings}
                    </p>
                  </div>

                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 transition-colors duration-300">
                    <span className="text-xs font-bold text-indigo-400 dark:text-indigo-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <Info size={12} /> Potential Factors
                    </span>
                    <p className="text-indigo-900 dark:text-indigo-200 text-sm leading-relaxed">
                      {selectedZone.insight}
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-6 text-center">
                  <button 
                    onClick={() => setSelectedZoneId(null)}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium flex items-center justify-center gap-1 mx-auto transition-colors"
                  >
                     View all zones
                  </button>
                </div>
              </div>
            ) : (
              // Default "All Zones" View
              <div className="flex-1 flex flex-col">
                <h4 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ArrowRightLeft size={14} /> Zone Summary
                </h4>
                
                {loading ? (
                  <div className="flex-1 space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-50 dark:bg-slate-700 rounded-xl animate-pulse" />)}
                  </div>
                ) : data ? (
                  <>
                    {/* Overall Summary Block */}
                    {data.overall_summary && (
                      <div className="mb-4 p-4 bg-teal-50/50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-900/30 text-sm text-teal-800 dark:text-teal-200 leading-relaxed transition-colors duration-300">
                         <div className="flex items-center gap-2 mb-2 text-teal-600 dark:text-teal-400 font-bold text-xs uppercase tracking-wider">
                           <Sparkles size={14} /> Analysis Summary
                         </div>
                         {data.overall_summary}
                      </div>
                    )}

                    {/* Zone List */}
                    <div className="space-y-2 overflow-y-auto max-h-[320px] pr-1 custom-scrollbar">
                      {data.zones.map(zone => (
                        <button
                          key={zone.id}
                          onClick={() => setSelectedZoneId(zone.id)}
                          className="w-full text-left p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 border border-transparent hover:border-gray-200 dark:hover:border-slate-600 transition-all group flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-gray-700 dark:text-gray-200 text-sm">{zone.label}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                               <span className={`w-2 h-2 rounded-full ${zone.severity === 'High' ? 'bg-red-500' : zone.severity === 'Medium' ? 'bg-orange-500' : 'bg-teal-500'}`} />
                               <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px]">{zone.findings}</span>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400" />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                    Select a zone on the map
                  </div>
                )}
                
                <div className="mt-auto pt-4 border-t border-gray-50 dark:border-slate-700">
                   <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center leading-tight">
                     Zone insights are non-medical estimates based on visual patterns. 
                     Please consult a dermatologist.
                   </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
