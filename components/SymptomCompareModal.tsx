import React, { useState, useRef, useEffect } from 'react';
import { 
  X, UploadCloud, Camera, RefreshCw, ArrowRight, AlertTriangle, 
  TrendingUp, Activity, Info, Pill, Eye
} from 'lucide-react';
import { CameraModal } from './CameraModal';
import { ComparisonSlider } from './ComparisonSlider';
import { analyzeHealthQuery, compareSkinAnalysis } from '../services/geminiService';
import { AnalysisResult, ComparisonResult } from '../types';

interface SymptomCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ComparisonStep = 'upload' | 'analyzing' | 'results';

export const SymptomCompareModal: React.FC<SymptomCompareModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<ComparisonStep>('upload');
  
  // Image State
  const [imageA, setImageA] = useState<string | null>(null);
  const [imageB, setImageB] = useState<string | null>(null);
  
  // We don't necessarily need to store File objects if we only use base64 for this specific feature,
  // but keeping them for consistency with original code if needed later.
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);

  // Analysis State
  const [resultA, setResultA] = useState<AnalysisResult | null>(null);
  const [resultB, setResultB] = useState<AnalysisResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Camera State
  const [activeCameraSlot, setActiveCameraSlot] = useState<'A' | 'B' | null>(null);
  const fileInputRefA = useRef<HTMLInputElement>(null);
  const fileInputRefB = useRef<HTMLInputElement>(null);

  // Auto-scroll ref
  const actionAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect
  useEffect(() => {
    if (isOpen && imageA && imageB && step === 'upload') {
      // Small delay to allow layout render
      setTimeout(() => {
        actionAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [imageA, imageB, step, isOpen]);

  if (!isOpen) return null;

  // --- Reset & Close ---
  const handleClose = () => {
    // Reset state on close
    setStep('upload');
    setImageA(null);
    setImageB(null);
    setResultA(null);
    setResultB(null);
    setComparisonResult(null);
    setError(null);
    onClose();
  };

  const handleStartOver = () => {
    setStep('upload');
    setResultA(null);
    setResultB(null);
    setComparisonResult(null);
    setError(null);
  };

  // --- Image Handling ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, slot: 'A' | 'B') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (slot === 'A') {
          setImageA(reader.result as string);
          setFileA(file);
        } else {
          setImageB(reader.result as string);
          setFileB(file);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (imageData: string) => {
    if (activeCameraSlot === 'A') {
      setImageA(imageData);
    } else if (activeCameraSlot === 'B') {
      setImageB(imageData);
    }
    setActiveCameraSlot(null);
  };

  // --- Analysis Logic ---
  const handleCompare = async () => {
    if (!imageA || !imageB) return;

    setStep('analyzing');
    setError(null);

    try {
      // 4a. Run model Analyze on each image individually AND the comparison
      const [resA, resB, compRes] = await Promise.all([
        analyzeHealthQuery("Analyze this image for symptom severity and key visible characteristics.", [imageA], { conditions: '', allergies: '', history: '' }),
        analyzeHealthQuery("Analyze this image for symptom severity and key visible characteristics.", [imageB], { conditions: '', allergies: '', history: '' }),
        compareSkinAnalysis(imageA, imageB)
      ]);

      setResultA(resA);
      setResultB(resB);
      setComparisonResult(compRes);
      setStep('results');
    } catch (err) {
      console.error(err);
      setError("Failed to analyze images. Please check your connection and try again.");
      setStep('upload');
    }
  };

  // --- Severity Logic ---
  const getSeverityScore = (result: AnalysisResult | null) => {
    if (!result) return { score: 0, label: 'Unknown', color: 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700' };
    
    // Search all card content for keywords
    const text = JSON.stringify(result.cards).toLowerCase();
    
    if (text.includes('severe') || text.includes('high severity') || text.includes('worsened')) {
      return { score: 3, label: 'Severe', color: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800' };
    }
    if (text.includes('moderate') || text.includes('medium')) {
      return { score: 2, label: 'Moderate', color: 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800' };
    }
    // Default to Mild if no other indicators, or explicit "mild"
    return { score: 1, label: 'Mild', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' };
  };

  const scoreA = getSeverityScore(resultA);
  const scoreB = getSeverityScore(resultB);
  
  // Calculate delta using the precise comparison result if available, else fallback
  let delta = 0;
  let plotScoreA = scoreA.score;
  let plotScoreB = scoreB.score;
  let cannotCompare = false;

  if (comparisonResult) {
     if (comparisonResult.progression === 'Cannot Compare') {
       cannotCompare = true;
     } else {
       delta = comparisonResult.changeScore;
       // Enforce graphical consistency with the textual verdict
       if (delta === 0) {
          // Stable: force flat line
          plotScoreB = plotScoreA; 
       } else if (delta > 0) {
          // Worsening: ensure B > A
          if (plotScoreB <= plotScoreA) {
            plotScoreB = Math.min(3, plotScoreA + 1);
            if (plotScoreB === plotScoreA) plotScoreA = Math.max(1, plotScoreB - 1);
          }
       } else if (delta < 0) {
          // Improving: ensure B < A
          if (plotScoreB >= plotScoreA) {
             plotScoreB = Math.max(1, plotScoreA - 1);
             if (plotScoreB === plotScoreA) plotScoreA = Math.min(3, plotScoreB + 1);
          }
       }
     }
  } else {
     delta = scoreB.score - scoreA.score;
  }

  // 6. Clinical Suggestion Trigger
  // Use comparison result progression if available
  const showSuggestion = comparisonResult 
    ? comparisonResult.progression === 'Worsening'
    : (delta >= 1 || (scoreA.score < 3 && scoreB.score === 3));

  // --- Graph Rendering ---
  const renderTrendGraph = () => {
    if (cannotCompare) {
       return (
         <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
            <span className="text-xs font-medium">Graph Unavailable</span>
         </div>
       );
    }

    const height = 100;
    const width = 200;
    const padding = 20;
    
    // Map 1-3 to Y coords
    const getY = (score: number) => height - padding - ((score - 1) / 2) * (height - 2 * padding);
    
    const yA = getY(plotScoreA || 1);
    const yB = getY(plotScoreB || 1);
    
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        {/* Grid lines */}
        <line x1={padding} y1={getY(1)} x2={width-padding} y2={getY(1)} stroke="currentColor" className="text-gray-200 dark:text-slate-700" strokeDasharray="4" />
        <line x1={padding} y1={getY(2)} x2={width-padding} y2={getY(2)} stroke="currentColor" className="text-gray-200 dark:text-slate-700" strokeDasharray="4" />
        <line x1={padding} y1={getY(3)} x2={width-padding} y2={getY(3)} stroke="currentColor" className="text-gray-200 dark:text-slate-700" strokeDasharray="4" />
        
        {/* Connection Line */}
        <line x1={padding + 20} y1={yA} x2={width - padding - 20} y2={yB} stroke={delta > 0 ? '#ef4444' : delta < 0 ? '#10b981' : '#6b7280'} strokeWidth="3" />
        
        {/* Points */}
        <circle cx={padding + 20} cy={yA} r="6" className="fill-white dark:fill-slate-800 stroke-gray-400 dark:stroke-slate-500 stroke-2" />
        <circle cx={width - padding - 20} cy={yB} r="6" className={`fill-white dark:fill-slate-800 stroke-2 ${delta > 0 ? 'stroke-red-500' : delta < 0 ? 'stroke-emerald-500' : 'stroke-gray-500 dark:stroke-slate-500'}`} />
        
        {/* Labels */}
        <text x={padding + 20} y={height + 15} textAnchor="middle" className="text-[10px] fill-gray-500 dark:fill-gray-400 font-medium">Scan A</text>
        <text x={width - padding - 20} y={height + 15} textAnchor="middle" className="text-[10px] fill-gray-500 dark:fill-gray-400 font-medium">Scan B</text>
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/70 backdrop-blur-md animate-fade-in" onClick={handleClose} />

      {/* Modal Content */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-5xl h-full max-h-[90vh] relative z-10 flex flex-col overflow-hidden animate-fade-in-scale">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0 transition-colors">
          <div className="flex items-center gap-3">
             <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
               <Activity size={24} />
             </div>
             <div>
               <h2 className="text-xl font-bold text-gray-900 dark:text-white">Symptom Compare</h2>
               <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Compare two scans to track progression</p>
             </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-slate-950/50 p-4 md:p-8 transition-colors">
          
          {step === 'upload' && (
            // Changed h-full to min-h-full to prevent clipping on small screens/mobile when content stacks
            <div className="max-w-4xl mx-auto min-h-full flex flex-col justify-start md:justify-center">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:h-auto shrink-0 pb-6">
                {/* Slot A */}
                <div className="flex flex-col gap-4">
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Earlier Scan (A)</span>
                  <div className={`relative aspect-square md:aspect-[4/3] rounded-3xl border-2 border-dashed transition-all overflow-hidden group
                    ${imageA ? 'border-teal-500 bg-white dark:bg-slate-800 shadow-md' : 'border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800/50 hover:border-teal-400 dark:hover:border-teal-600 hover:bg-white dark:hover:bg-slate-800'}`}>
                    
                    {imageA ? (
                      <>
                        <img src={imageA} alt="Slot A" className="w-full h-full object-cover" />
                        <button 
                           onClick={() => setImageA(null)} 
                           className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors z-10"
                        >
                          <X size={16} />
                        </button>
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-white text-xs font-medium text-center backdrop-blur-sm">
                          Image A Ready
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <div className="flex gap-2">
                           <button onClick={() => fileInputRefA.current?.click()} className="p-4 bg-white dark:bg-slate-700 rounded-2xl shadow-sm hover:scale-110 transition-transform text-blue-600 dark:text-blue-400" aria-label="Upload A">
                              <UploadCloud size={24} />
                           </button>
                           <button onClick={() => setActiveCameraSlot('A')} className="p-4 bg-white dark:bg-slate-700 rounded-2xl shadow-sm hover:scale-110 transition-transform text-teal-600 dark:text-teal-400" aria-label="Camera A">
                              <Camera size={24} />
                           </button>
                        </div>
                        <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">Upload or Capture A</p>
                      </div>
                    )}
                    <input type="file" ref={fileInputRefA} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'A')} />
                  </div>
                </div>

                {/* Slot B */}
                <div className="flex flex-col gap-4">
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Later Scan (B)</span>
                  <div className={`relative aspect-square md:aspect-[4/3] rounded-3xl border-2 border-dashed transition-all overflow-hidden group
                    ${imageB ? 'border-teal-500 bg-white dark:bg-slate-800 shadow-md' : 'border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800/50 hover:border-teal-400 dark:hover:border-teal-600 hover:bg-white dark:hover:bg-slate-800'}`}>
                    
                    {imageB ? (
                      <>
                        <img src={imageB} alt="Slot B" className="w-full h-full object-cover" />
                        <button 
                           onClick={() => setImageB(null)} 
                           className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors z-10"
                        >
                          <X size={16} />
                        </button>
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-white text-xs font-medium text-center backdrop-blur-sm">
                          Image B Ready
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <div className="flex gap-2">
                           <button onClick={() => fileInputRefB.current?.click()} className="p-4 bg-white dark:bg-slate-700 rounded-2xl shadow-sm hover:scale-110 transition-transform text-blue-600 dark:text-blue-400" aria-label="Upload B">
                              <UploadCloud size={24} />
                           </button>
                           <button onClick={() => setActiveCameraSlot('B')} className="p-4 bg-white dark:bg-slate-700 rounded-2xl shadow-sm hover:scale-110 transition-transform text-teal-600 dark:text-teal-400" aria-label="Camera B">
                              <Camera size={24} />
                           </button>
                        </div>
                        <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">Upload or Capture B</p>
                      </div>
                    )}
                    <input type="file" ref={fileInputRefB} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'B')} />
                  </div>
                </div>
              </div>

              {/* Action Area */}
              <div ref={actionAreaRef} className="mt-2 mb-8 flex flex-col items-center justify-center shrink-0">
                 {(!imageA || !imageB) && (
                   <p className="text-gray-400 dark:text-gray-500 text-sm mb-4 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm flex items-center gap-2 border border-gray-100 dark:border-slate-700">
                     <Info size={16} />
                     Please provide both images to start comparison
                   </p>
                 )}
                 {error && (
                   <p className="text-red-500 dark:text-red-400 text-sm mb-4 font-medium flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                     <AlertTriangle size={16} /> {error}
                   </p>
                 )}
                 <button
                   onClick={handleCompare}
                   disabled={!imageA || !imageB}
                   className="w-full max-w-md py-4 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform active:scale-95 flex items-center justify-center gap-2"
                 >
                   Compare Images <ArrowRight size={20} />
                 </button>
              </div>
            </div>
          )}

          {step === 'analyzing' && (
            <div className="h-full flex flex-col items-center justify-center gap-6">
               <div className="relative">
                 <div className="w-20 h-20 border-4 border-gray-200 dark:border-slate-700 border-t-teal-500 rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                   <Activity className="text-teal-500 animate-pulse" size={32} />
                 </div>
               </div>
               <div className="text-center space-y-2">
                 <h3 className="text-xl font-bold text-gray-800 dark:text-white">Analyzing Differences...</h3>
                 <p className="text-gray-500 dark:text-gray-400">Comparing visible symptoms and severity markers.</p>
               </div>
            </div>
          )}

          {step === 'results' && resultA && resultB && (
            <div className="space-y-8 max-w-5xl mx-auto animate-fade-in-up pb-8">
              
              {/* Cannot Compare Alert */}
              {cannotCompare && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-center text-center md:text-left">
                   <div className="p-3 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 rounded-full shrink-0">
                     <AlertTriangle size={32} />
                   </div>
                   <div className="flex-1">
                     <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-1">Comparison Unavailable</h3>
                     <p className="text-red-700 dark:text-red-300 text-sm">
                       {comparisonResult?.suggestion || "These scans appear to be mismatched (different person or body region). Please compare images of the same area."}
                     </p>
                   </div>
                </div>
              )}

              {/* Top Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Image A Info */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-2 transition-colors">
                   <div className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">
                      <Eye size={12} /> Earlier Scan (A)
                   </div>
                   <div className={`px-3 py-1.5 rounded-lg text-sm font-bold w-fit ${scoreA.color}`}>
                     {comparisonResult ? comparisonResult.severityA : scoreA.label}
                   </div>
                   <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-4 leading-relaxed">
                     {comparisonResult?.observationA || resultA.cards.find(c => c.type === 'facts')?.content || "No details detected."}
                   </p>
                </div>

                {/* Delta / Graph */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center relative overflow-hidden transition-colors">
                   <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-gray-200 via-gray-400 to-gray-200 dark:from-slate-700 dark:via-slate-500 dark:to-slate-700 opacity-20"></div>
                   <div className="w-full h-24 mb-2 flex items-center justify-center">
                     {renderTrendGraph()}
                   </div>
                   <div className="flex items-center gap-2">
                     {cannotCompare ? (
                        <span className="text-gray-400 dark:text-gray-500 font-bold text-sm flex items-center gap-1">
                          --
                        </span>
                     ) : delta > 0 ? (
                       <span className="text-red-500 dark:text-red-400 font-bold text-sm flex items-center gap-1">
                         <TrendingUp size={16} /> Worsening (+{delta})
                       </span>
                     ) : delta < 0 ? (
                       <span className="text-emerald-500 dark:text-emerald-400 font-bold text-sm flex items-center gap-1">
                         <TrendingUp size={16} className="rotate-180" /> Improving ({delta})
                       </span>
                     ) : (
                       <span className="text-gray-500 dark:text-gray-400 font-bold text-sm flex items-center gap-1">
                         <Activity size={16} /> Stable
                       </span>
                     )}
                   </div>
                </div>

                {/* Image B Info */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-2 transition-colors">
                   <div className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">
                      <Eye size={12} /> Later Scan (B)
                   </div>
                   <div className={`px-3 py-1.5 rounded-lg text-sm font-bold w-fit ${scoreB.color}`}>
                     {comparisonResult ? comparisonResult.severityB : scoreB.label}
                   </div>
                   <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-4 leading-relaxed">
                     {comparisonResult?.observationB || resultB.cards.find(c => c.type === 'facts')?.content || "No details detected."}
                   </p>
                </div>
              </div>

              {/* Slider Visual */}
              <div className="bg-white dark:bg-slate-800 p-1.5 rounded-3xl shadow-md border border-gray-100 dark:border-slate-700 transition-colors">
                <div className="relative aspect-[4/3] md:aspect-[16/9] bg-gray-100 dark:bg-slate-900 rounded-[20px] overflow-hidden">
                  <ComparisonSlider 
                    beforeImage={imageA!} 
                    afterImage={imageB!}
                    beforeLabel="Earlier (A)"
                    afterLabel="Later (B)"
                  />
                </div>
              </div>

              {/* 6. Clinical Suggestion Trigger */}
              {!cannotCompare && (showSuggestion || (comparisonResult && comparisonResult.suggestion)) && (
                <div className={`border rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start shadow-sm animate-pulse-subtle
                   ${showSuggestion ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/40' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40'}`}>
                   <div className={`p-3 rounded-xl flex-shrink-0 ${showSuggestion ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'}`}>
                     {showSuggestion ? <AlertTriangle size={28} /> : <Info size={28} />}
                   </div>
                   <div className="flex-1 space-y-3">
                     <h4 className={`text-lg font-bold ${showSuggestion ? 'text-gray-900 dark:text-white' : 'text-blue-900 dark:text-blue-200'}`}>
                       {showSuggestion ? "Consultation Recommended" : "Comparison Insight"}
                     </h4>
                     <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                       {comparisonResult ? comparisonResult.suggestion : 
                        "Symptoms appear to have worsened. Consider consulting a healthcare professional for a proper evaluation."}
                     </p>
                     
                     {showSuggestion && (
                       <div className="flex flex-wrap gap-2 pt-1">
                         <span className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700">
                           Book Dermatologist
                         </span>
                         <span className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700">
                           Avoid Irritants
                         </span>
                         <span className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700">
                           Track Daily
                         </span>
                       </div>
                     )}
                   </div>
                </div>
              )}

              {/* 7. Safe Medicine Suggestion (if available) */}
              {!cannotCompare && comparisonResult?.medicineSuggestion && (
                 <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-900/40 rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-start shadow-sm">
                    <div className="p-2.5 bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 rounded-xl shrink-0">
                      <Pill size={24} />
                    </div>
                    <div>
                       <h4 className="text-lg font-bold text-teal-900 dark:text-teal-200 mb-2">Over-the-Counter Options</h4>
                       <p className="text-teal-800 dark:text-teal-300 text-sm leading-relaxed">
                         {comparisonResult.medicineSuggestion}
                       </p>
                       <p className="text-[10px] text-teal-600 dark:text-teal-400 font-medium mt-2 opacity-80">
                         Always patch test new products. I am an AI, not a doctor.
                       </p>
                    </div>
                 </div>
              )}

              {/* Footer Actions */}
              <div className="flex justify-center pt-8 pb-4">
                 <button 
                   onClick={handleStartOver}
                   className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                 >
                   <RefreshCw size={18} /> Start New Comparison
                 </button>
              </div>

              <p className="text-center text-[10px] text-gray-400 dark:text-gray-500">
                 I am an AI assistant, not a medical professional. Please consult a doctor for medical advice.
              </p>

            </div>
          )}

        </div>
      </div>

      {/* Camera Modal for Slot A or B */}
      <CameraModal 
        isOpen={!!activeCameraSlot}
        onClose={() => setActiveCameraSlot(null)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
};
