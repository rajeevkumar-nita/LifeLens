import React, { useState, useMemo } from 'react';
import { AnalysisResult, SmartCard, HistoryItem } from '../types';
import { 
  AlertTriangle, Droplet, Utensils, Info, CheckCircle, 
  Activity, Copy, Check, Share2, ChevronDown, ChevronUp,
  BookOpen, Lightbulb, Calendar, Pill, Stethoscope, TrendingUp, TrendingDown, Minus, ShieldCheck, ScanFace
} from 'lucide-react';

interface ResultCardsProps {
  result: AnalysisResult | null;
  isLoading?: boolean;
  history?: HistoryItem[];
  onCreatePlanner?: () => void;
  onToggleZoneMap?: () => void;
  isZoneMapOpen?: boolean;
  hasImages?: boolean;
}

// --- Severity Logic ---

interface SeverityData {
  score: number; // 1-10
  label: 'Mild' | 'Moderate' | 'Severe' | 'Unknown';
  color: string;
  bgColor: string;
  borderColor: string;
}

const calculateSeverity = (result: AnalysisResult): SeverityData => {
  if (!result) return { score: 0, label: 'Unknown', color: 'text-gray-500 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-slate-800', borderColor: 'border-gray-200 dark:border-slate-700' };

  // 1. Check for explicit SeverityScore in facts (Deterministic Approach)
  const factsCard = result.cards.find(c => c.type === 'facts');
  if (factsCard) {
    const scoreMatch = factsCard.content.match(/SeverityScore:\s*(\d+)/i);
    if (scoreMatch) {
      const score = Math.max(1, Math.min(10, parseInt(scoreMatch[1], 10)));
      
      if (score >= 7) {
        return { 
          score, 
          label: 'Severe', 
          color: 'text-red-700 dark:text-red-300', 
          bgColor: 'bg-red-50 dark:bg-red-900/20', 
          borderColor: 'border-red-200 dark:border-red-900/40' 
        };
      } else if (score >= 4) {
        return { 
          score, 
          label: 'Moderate', 
          color: 'text-orange-700 dark:text-orange-300', 
          bgColor: 'bg-orange-50 dark:bg-orange-900/20', 
          borderColor: 'border-orange-200 dark:border-orange-900/40' 
        };
      } else {
        return { 
          score, 
          label: 'Mild', 
          color: 'text-emerald-700 dark:text-emerald-300', 
          bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', 
          borderColor: 'border-emerald-200 dark:border-emerald-900/40' 
        };
      }
    }
  }

  // 2. Fallback: Heuristic Keyword Matching (if no score found)
  const text = result.cards.map(c => `${c.title} ${c.content}`).join(' ').toLowerCase();
  
  // SEVERE (Score 7-10)
  if (
    text.includes('severe') || 
    text.includes('urgent') || 
    text.includes('emergency') || 
    text.includes('seek medical') || 
    text.includes('infection') || 
    text.includes('pus') ||
    text.includes('deep') ||
    text.includes('widespread') ||
    text.includes('consult a doctor') ||
    text.includes('high severity') ||
    (text.includes('large number') && text.includes('lesions')) ||
    text.includes('heavy redness')
  ) {
    return { 
      score: 8, 
      label: 'Severe', 
      color: 'text-red-700 dark:text-red-300', 
      bgColor: 'bg-red-50 dark:bg-red-900/20', 
      borderColor: 'border-red-200 dark:border-red-900/40' 
    };
  }

  // MODERATE (Score 4-6)
  if (
    text.includes('moderate') || 
    text.includes('inflammation') || 
    text.includes('inflamed') || 
    text.includes('erythematous') || 
    text.includes('pustules') || 
    text.includes('redness') || 
    text.includes('multiple lesions') ||
    text.includes('irritation') ||
    text.includes('noticeable')
  ) {
    return { 
      score: 5, 
      label: 'Moderate', 
      color: 'text-orange-700 dark:text-orange-300', 
      bgColor: 'bg-orange-50 dark:bg-orange-900/20', 
      borderColor: 'border-orange-200 dark:border-orange-900/40' 
    };
  }

  // MILD (Score 1-3)
  return { 
    score: 2, 
    label: 'Mild', 
    color: 'text-emerald-700 dark:text-emerald-300', 
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', 
    borderColor: 'border-emerald-200 dark:border-emerald-900/40' 
  };
};

const getCategoryStyles = (category: string) => {
  switch (category) {
    case 'Nutrition':
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-100 dark:border-green-800',
        text: 'text-green-800 dark:text-green-200',
        accent: 'bg-green-500',
        icon: <Utensils className="text-green-600 dark:text-green-400" size={24} />
      };
    case 'Skincare':
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-100 dark:border-blue-800',
        text: 'text-blue-800 dark:text-blue-200',
        accent: 'bg-blue-500',
        icon: <Droplet className="text-blue-600 dark:text-blue-400" size={24} />
      };
    case 'Medicine':
      return {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-100 dark:border-purple-800',
        text: 'text-purple-800 dark:text-purple-200',
        accent: 'bg-purple-500',
        icon: <Pill className="text-purple-600 dark:text-purple-400" size={24} />
      };
    case 'Alert':
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-100 dark:border-red-800',
        text: 'text-red-800 dark:text-red-200',
        accent: 'bg-red-500',
        icon: <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
      };
    default:
      return {
        bg: 'bg-gray-50 dark:bg-slate-800',
        border: 'border-gray-100 dark:border-slate-700',
        text: 'text-gray-800 dark:text-gray-200',
        accent: 'bg-gray-500',
        icon: <Activity className="text-gray-600 dark:text-gray-400" size={24} />
      };
  }
};

const getCardTypeIcon = (type: string) => {
  switch (type) {
    case 'facts': return <BookOpen size={18} />;
    case 'advice': return <Lightbulb size={18} />;
    case 'routine': return <Calendar size={18} />;
    default: return <Info size={18} />;
  }
};

const getCardTypeLabel = (type: string) => {
  switch (type) {
    case 'facts': return 'Key Facts';
    case 'advice': return 'Smart Advice';
    case 'routine': return 'Daily Vibe';
    default: return 'Insight';
  }
};

const getCardTypeTooltip = (type: string) => {
  switch (type) {
    case 'facts': return 'Core data and observations extracted from your input.';
    case 'advice': return 'Actionable steps to improve your health or situation.';
    case 'routine': return 'Daily habits to help you maintain consistency.';
    default: return 'General information.';
  }
};

const CardItem: React.FC<{ card: SmartCard; categoryStyles: any; index: number }> = ({ card, categoryStyles, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const contentLimit = 160;
  const isLong = card.content.length > contentLimit;

  const handleCopy = () => {
    const textToCopy = `${card.title}\n\n${card.content}`;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShare = async () => {
    const textToShare = `${card.title}\n\n${card.content}`;
    const shareData = {
      title: 'LifeLens Insight',
      text: textToShare,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      navigator.clipboard.writeText(textToShare);
      alert('Sharing is not supported on this browser. Content copied to clipboard!');
    }
  };

  const displayContent = (!isExpanded && isLong) 
    ? card.content.slice(0, contentLimit) + '...' 
    : card.content;

  return (
    <div 
      className={`bg-white dark:bg-slate-800 border ${categoryStyles.border} rounded-2xl p-5 sm:p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] dark:shadow-none hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-300 relative group flex flex-col h-full w-full`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className={`absolute top-0 left-0 w-1.5 h-full ${categoryStyles.accent} rounded-l-2xl`} />
      
      <div className="flex flex-col h-full gap-3 sm:gap-4 pl-2 sm:pl-3">
        {/* Header Section */}
        <div className="flex items-start justify-between gap-2">
          <div className="relative group/tooltip cursor-help z-10 pt-1">
            <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${categoryStyles.text} opacity-80`}>
              {getCardTypeIcon(card.type)}
              <span>{getCardTypeLabel(card.type)}</span>
            </div>
            
            <div className="absolute bottom-full left-0 mb-2 w-48 p-3 bg-gray-800 dark:bg-slate-700 text-white text-xs rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 shadow-xl pointer-events-none font-medium leading-relaxed normal-case z-20">
              {getCardTypeTooltip(card.type)}
              <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-800 dark:border-t-slate-700"></div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleShare}
              className="p-1.5 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-blue-500"
              title="Share"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={handleCopy}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                isCopied 
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                  : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
              }`}
              title="Copy"
            >
              {isCopied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
        
        <h3 className={`text-lg font-bold text-gray-900 dark:text-white leading-snug break-words`}>
          {card.title}
        </h3>
        
        <div className="flex-1 min-h-0">
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {displayContent}
          </p>
        </div>

        {isLong && (
          <div className="mt-auto pt-2">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 hover:underline ${categoryStyles.text} transition-colors`}
            >
              {isExpanded ? (
                <>Show Less <ChevronUp size={14} /></>
              ) : (
                <>Read More <ChevronDown size={14} /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm h-64 animate-pulse flex flex-col gap-4">
    <div className="flex justify-between items-center">
      <div className="h-4 w-24 bg-gray-100 dark:bg-slate-700 rounded-full"></div>
      <div className="h-8 w-8 bg-gray-100 dark:bg-slate-700 rounded-lg"></div>
    </div>
    <div className="h-6 w-3/4 bg-gray-100 dark:bg-slate-700 rounded-lg"></div>
    <div className="space-y-3 flex-1">
      <div className="h-3 w-full bg-gray-100 dark:bg-slate-700 rounded"></div>
      <div className="h-3 w-full bg-gray-100 dark:bg-slate-700 rounded"></div>
      <div className="h-3 w-2/3 bg-gray-100 dark:bg-slate-700 rounded"></div>
    </div>
  </div>
);

export const ResultCards: React.FC<ResultCardsProps> = ({ 
  result, 
  isLoading, 
  history = [], 
  onCreatePlanner,
  onToggleZoneMap,
  isZoneMapOpen,
  hasImages
}) => {
  const severity = useMemo(() => result ? calculateSeverity(result) : null, [result]);

  const trend = useMemo(() => {
    if (!result || !severity || history.length === 0) return null;
    const previousEntry = history.find(item => item.result !== result && item.result.category === result.category);
    if (!previousEntry) return null;
    const prevSeverity = calculateSeverity(previousEntry.result);
    if (severity.score > prevSeverity.score) return 'worsened';
    if (severity.score < prevSeverity.score) return 'improved';
    return 'stable';
  }, [result, history, severity]);

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto mt-12 space-y-8 px-4">
        <div className="h-10 w-48 bg-gray-200 dark:bg-slate-800 rounded-full mx-auto animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!result || !severity) return null;

  const categoryStyles = getCategoryStyles(result.category);

  return (
    <div className="w-full max-w-6xl mx-auto mt-8 space-y-8 animate-fade-in-up px-2 sm:px-4">
      
      {/* Category Header */}
      <div className={`flex items-center justify-center gap-3 py-2 px-6 rounded-full w-fit mx-auto ${categoryStyles.bg} border ${categoryStyles.border} shadow-sm`}>
        {categoryStyles.icon}
        <span className={`font-bold ${categoryStyles.text} text-lg`}>{result.category} Analysis</span>
      </div>

      {/* Severity Meter & Doctor Alert */}
      {(result.category === 'Skincare' || result.category === 'Alert' || result.category === 'General') && (
        <div className="max-w-3xl mx-auto space-y-4">
          
          <div className={`w-full bg-white dark:bg-slate-800 rounded-2xl border ${severity.borderColor} p-4 shadow-sm flex flex-col sm:flex-row items-center gap-4 animate-fade-in-scale`}>
            <div className={`flex-shrink-0 px-4 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${severity.color} ${severity.bgColor}`}>
              <Activity size={18} />
              Severity: {severity.label}
            </div>
            <div className="flex-1 w-full h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden relative">
              <div 
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out 
                  ${severity.score <= 3 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 
                    severity.score <= 6 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 
                    'bg-gradient-to-r from-orange-500 to-red-600'}`}
                style={{ width: `${severity.score * 10}%` }}
              />
              <div className="absolute top-0 left-1/3 w-0.5 h-full bg-white/50 dark:bg-slate-900/50"></div>
              <div className="absolute top-0 left-2/3 w-0.5 h-full bg-white/50 dark:bg-slate-900/50"></div>
            </div>
            {trend && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-slate-600" title="Compared to last scan">
                {trend === 'worsened' && <><TrendingUp size={14} className="text-red-500" /> Worsened</>}
                {trend === 'improved' && <><TrendingDown size={14} className="text-green-500" /> Improved</>}
                {trend === 'stable' && <><Minus size={14} className="text-gray-400" /> Stable</>}
              </div>
            )}
          </div>

          {severity.score >= 7 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-2xl p-5 flex gap-4 items-start shadow-sm animate-pulse-subtle">
               <div className="p-2.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 rounded-xl flex-shrink-0">
                 <Stethoscope size={24} />
               </div>
               <div className="space-y-1">
                 <h4 className="text-red-800 dark:text-red-200 font-bold text-lg">Consultation Recommended</h4>
                 <p className="text-red-700/80 dark:text-red-300/80 text-sm leading-relaxed">
                   Your symptoms appear more severe than usual. It may be helpful to consult a dermatologist soon.
                 </p>
                 <p className="text-[10px] text-red-400 dark:text-red-400 font-medium pt-2">
                   I am an AI assistant, not a medical professional. Please consult a doctor for medical advice.
                 </p>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 auto-rows-fr">
        {result.cards.map((card, index) => (
          <CardItem key={index} index={index} card={card} categoryStyles={categoryStyles} />
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 pt-4">
        {/* Treatment Planner CTA - Only for Skin related analysis */}
        {onCreatePlanner && (result.category === 'Skincare' || result.category === 'General') && (
          <button 
            onClick={onCreatePlanner}
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-teal-500/30 hover:shadow-teal-500/40 hover:-translate-y-0.5 transition-all active:scale-95 group"
          >
            <ShieldCheck size={20} className="group-hover:scale-110 transition-transform" />
            Create Treatment Planner
          </button>
        )}

        {/* Zone Map Toggle */}
        {onToggleZoneMap && hasImages && (result.category === 'Skincare' || result.category === 'General') && (
          <button 
            onClick={onToggleZoneMap}
            className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-700 shadow-sm transition-all group"
          >
            <ScanFace size={18} className="group-hover:scale-110 transition-transform" />
            {isZoneMapOpen ? "Hide Zone Map" : "Show Skin Zone Map"}
          </button>
        )}
      </div>
    </div>
  );
};
