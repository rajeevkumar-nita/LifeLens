import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { ResultCards } from './components/ResultCards';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ProfileModal } from './components/ProfileModal';
import { SymptomTracker } from './components/SymptomTracker';
import { SymptomCompareModal } from './components/SymptomCompareModal';
import { NewChatModal } from './components/NewChatModal';
import { TreatmentPlannerModal } from './components/TreatmentPlannerModal';
import { TriggerCard } from './components/TriggerCard';
import { SkinZoneMap } from './components/SkinZoneMap';
import { analyzeHealthQuery, generateTreatmentPlan, refineAnalysisWithTriggers, predictTriggers } from './services/geminiService';
import { AnalysisResult, HistoryItem, LoadingState, UserProfile, TreatmentPlan } from './types';
import { History, CheckCircle2, TrendingUp, Loader2, ScanFace, Zap } from 'lucide-react';
import { useTheme } from './hooks/useTheme';

const DEFAULT_HISTORY: HistoryItem[] = [];

const DEFAULT_PROFILE: UserProfile = {
  conditions: '',
  allergies: '',
  history: ''
};

// Rate Limit Constants
const COOLDOWN_DURATION = 30000; // 30 seconds standard
const QUOTA_ERROR_DURATION = 60000; // 60 seconds for 429s

// Helper to generate a unique session ID
const generateChatId = () => `lifelens_chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const App: React.FC = () => {
  // Theme Hook
  const { theme, toggleTheme } = useTheme();

  // ---------------------------------------------------------------------------
  // GLOBAL STATE: MEDICAL PROFILE (CANONICAL DESIGN - DO NOT CHANGE)
  // ---------------------------------------------------------------------------
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('lifelens_profile');
        return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
      }
      return DEFAULT_PROFILE;
    } catch (e) {
      console.error("Failed to load profile", e);
      return DEFAULT_PROFILE;
    }
  });

  // ---------------------------------------------------------------------------
  // SESSION STATE (Chat-Scoped)
  // ---------------------------------------------------------------------------
  const [chatId, setChatId] = useState<string>(generateChatId);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [currentImages, setCurrentImages] = useState<string[]>([]); // New: Store array of images
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  
  // Rate Limiting State
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Chat-Scoped History & Planning
  const [history, setHistory] = useState<HistoryItem[]>(DEFAULT_HISTORY);
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
  
  // Feature Toggles & UI State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isCachedToast, setIsCachedToast] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [activeTriggers, setActiveTriggers] = useState<string[]>([]);
  const [triggerSuggestions, setTriggerSuggestions] = useState<string | null>(null);
  const [isTriggerCardVisible, setIsTriggerCardVisible] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isZoneMapOpen, setIsZoneMapOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // RATE LIMITING LOGIC
  // ---------------------------------------------------------------------------
  
  // Initialize cooldown from localStorage on mount
  useEffect(() => {
    const cooldownUntil = localStorage.getItem('lifelens_cooldown_until');
    if (cooldownUntil) {
      const remaining = Math.ceil((parseInt(cooldownUntil) - Date.now()) / 1000);
      if (remaining > 0) {
        setCooldownSeconds(remaining);
      }
    }
  }, []);

  // Cooldown Timer Effect
  useEffect(() => {
    if (cooldownSeconds > 0) {
      cooldownTimerRef.current = setTimeout(() => {
        setCooldownSeconds(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, [cooldownSeconds]);

  const startCooldown = (durationMs: number) => {
    const until = Date.now() + durationMs;
    localStorage.setItem('lifelens_cooldown_until', until.toString());
    setCooldownSeconds(Math.ceil(durationMs / 1000));
  };

  // ---------------------------------------------------------------------------
  // SESSION LIFECYCLE EFFECTS
  // ---------------------------------------------------------------------------
  
  // Load History & Planner for specific Chat ID
  useEffect(() => {
    setIsHistoryLoading(true);
    const timer = setTimeout(() => {
      // Storage Key Format: lifelens_history_<chatId>
      const sessionKey = `lifelens_history_${chatId}`;
      const savedHistory = localStorage.getItem(sessionKey);
      
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error("Failed to parse history", e);
          setHistory([]);
        }
      } else {
        setHistory([]);
      }
      setIsHistoryLoading(false);

      // Load Planner for this chat
      const planKey = `lifelens_plan_${chatId}`;
      const savedPlan = localStorage.getItem(planKey);
      if (savedPlan) {
        try {
          const plan = JSON.parse(savedPlan);
          setTreatmentPlan(plan);
          if (plan.triggers) setActiveTriggers(plan.triggers); // Restore triggers if saved in plan
        } catch (e) {
          console.error("Failed to parse planner", e);
        }
      } else {
        setTreatmentPlan(null);
      }
    }, 400); // Simulate subtle load

    return () => clearTimeout(timer);
  }, [chatId]);

  // Save History for specific Chat ID
  useEffect(() => {
    if (!isHistoryLoading) {
      const sessionKey = `lifelens_history_${chatId}`;
      localStorage.setItem(sessionKey, JSON.stringify(history));
    }
  }, [history, isHistoryLoading, chatId]);

  // Save Planner for specific Chat ID
  useEffect(() => {
    if (treatmentPlan) {
      const planKey = `lifelens_plan_${chatId}`;
      localStorage.setItem(planKey, JSON.stringify(treatmentPlan));
    }
  }, [treatmentPlan, chatId]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  // Trigger New Chat Flow
  const handleNewChatClick = () => {
    setShowNewChatModal(true);
  };

  const triggerToast = (msg: string, isCached = false) => {
    setToastMessage(msg);
    setIsCachedToast(isCached);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Confirm New Chat: Reset Session Data Only
  const handleConfirmNewChat = () => {
    // 1. Clear current session storage
    const oldSessionKey = `lifelens_history_${chatId}`;
    const oldPlanKey = `lifelens_plan_${chatId}`;
    localStorage.removeItem(oldSessionKey);
    localStorage.removeItem(oldPlanKey);

    // 2. Generate new session ID
    const newChatId = generateChatId();
    setChatId(newChatId);

    // 3. Reset UI/Session State
    // IMPORTANT: DO NOT RESET GLOBAL USER PROFILE HERE.
    setHistory([]);
    setCurrentResult(null);
    setCurrentImages([]);
    setTreatmentPlan(null);
    setActiveTriggers([]);
    setTriggerSuggestions(null);
    setIsTriggerCardVisible(false);
    setIsZoneMapOpen(false);
    setLoadingState('idle');
    setError(null);
    setShowNewChatModal(false);
    setIsTrackerOpen(false);
    setIsCompareModalOpen(false);
    setIsPlannerOpen(false);

    // 4. Show Toast
    triggerToast("New chat started — ready for your first scan.");
  };

  // Save Profile: Synchronous update to state and storage
  const handleSaveProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('lifelens_profile', JSON.stringify(profile));
  };

  const handleAnalyze = async (text: string, images: string[]) => {
    // 1. GLOBAL REQUEST LOCK & RATE LIMIT CHECK
    if (loadingState === 'analyzing') return;
    
    if (cooldownSeconds > 0) {
      setError(`AI is temporarily busy. Please try again in ${cooldownSeconds}s.`);
      return;
    }
    
    if (!text && images.length === 0) {
       setError("Please provide text or an image to analyze.");
       return;
    }

    // Start Lock
    setLoadingState('analyzing');
    setError(null);
    setCurrentResult(null);
    setCurrentImages(images);
    setActiveTriggers([]); // Reset triggers on new analysis
    setTriggerSuggestions(null);
    setIsTriggerCardVisible(false);
    setIsZoneMapOpen(false);

    try {
      // 2. Start Cooldown (Optimistic rate limiting)
      startCooldown(COOLDOWN_DURATION);

      // Pass array of images to service
      const result = await analyzeHealthQuery(text, images, userProfile);
      
      setCurrentResult(result);
      setLoadingState('success');
      
      if (result.fromCache) {
        triggerToast("Using cached analysis", true);
      }

      // Auto-show trigger card and predict if Skincare/General and High/Medium confidence
      if (result.category === 'Skincare' || result.category === 'General') {
         const isLowConfidence = result.cards.some(c => c.content.toLowerCase().includes('confidence: low'));
         if (!isLowConfidence) {
           setTimeout(() => setIsTriggerCardVisible(true), 1000);
         }
         
         // Trigger prediction parallel call
         predictTriggers(result, userProfile)
            .then(suggestions => setTriggerSuggestions(suggestions))
            .catch(err => console.error("Trigger prediction failed silently", err));
      }

      // Automatic Storage
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        imageUrl: images.length > 0 ? images[0] : undefined, // Keep primary image for backward compatibility
        imageUrls: images, // Store all images
        query: text || (images.length > 0 ? 'Image Analysis' : 'Query'),
        result: result,
      };

      setHistory(prev => [newHistoryItem, ...prev]); 
      
    } catch (err: any) {
      // 3. HTTP 429 & ERROR HANDLING
      console.error(err);
      
      let errorMessage = "AI is temporarily unavailable due to high usage. Please wait a moment and try again.";
      let isQuotaError = false;

      if (err instanceof Error || (typeof err === 'object' && err !== null && 'message' in err)) {
        const msg = (err.message || '').toLowerCase();
        
        // Detect Quota/Rate Limit Errors
        if (msg.includes('429') || msg.includes('resource exhausted') || msg.includes('quota') || msg.includes('503')) {
          errorMessage = "Daily AI limit reached. Please try again in a few seconds.";
          isQuotaError = true;
        } else if (msg.includes('fetch failed') || msg.includes('network')) {
          errorMessage = "Network error. Please check your internet connection.";
        } else if (msg.includes('safety') || msg.includes('blocked')) {
          errorMessage = "Request blocked by safety filters. Please try a different image or prompt.";
        }
      }

      // Apply stricter cooldown for quota errors
      if (isQuotaError) {
        startCooldown(QUOTA_ERROR_DURATION);
      }

      setError(errorMessage);
      setLoadingState('error');
    }
  };

  const handleCreatePlanner = async () => {
    if (!currentResult) return;
    if (cooldownSeconds > 0) {
      triggerToast(`Please wait ${cooldownSeconds}s before creating a plan.`);
      return;
    }
    
    setIsGeneratingPlan(true);
    try {
      startCooldown(COOLDOWN_DURATION);
      // Pass activeTriggers to planner generation
      const plan = await generateTreatmentPlan(currentResult, userProfile, activeTriggers);
      setTreatmentPlan(plan);
      setIsPlannerOpen(true);
    } catch (err) {
      console.error(err);
      setError("Failed to create treatment plan. Please try again.");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleRefineAnalysis = async () => {
    if (!currentResult || activeTriggers.length === 0) return;
    if (cooldownSeconds > 0) {
      triggerToast(`Please wait ${cooldownSeconds}s before refining.`);
      return;
    }
    
    setIsRefining(true);
    try {
      startCooldown(COOLDOWN_DURATION);
      // 1. Refine the advice cards (JSON structure)
      const refinedResult = await refineAnalysisWithTriggers(currentResult, activeTriggers, userProfile);
      setCurrentResult(refinedResult);

      // 2. Refine the trigger suggestions text based on selection
      const updatedSuggestions = await predictTriggers(refinedResult, userProfile, activeTriggers);
      setTriggerSuggestions(updatedSuggestions);
      
      // Show success toast
      triggerToast("Advice refined!");
    } catch (err) {
      console.error(err);
      setError("Failed to refine advice. Please try again.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleToggleTrigger = (trigger: string) => {
    setActiveTriggers(prev => 
      prev.includes(trigger) ? prev.filter(t => t !== trigger) : [...prev, trigger]
    );
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setCurrentResult(item.result);
    // Use stored images array if available, otherwise fallback to single image
    const images = item.imageUrls || (item.imageUrl ? [item.imageUrl] : []);
    setCurrentImages(images);
    
    // When selecting history, we reset triggers unless we stored them in history (which we didn't implement fully for history items yet, only per-chat session state)
    setActiveTriggers([]);
    setTriggerSuggestions(null);
    setIsTriggerCardVisible(false); 
    setIsZoneMapOpen(false);
    setIsHistoryOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearHistory = () => {
    setHistory([]);
    const sessionKey = `lifelens_history_${chatId}`;
    localStorage.removeItem(sessionKey);
  };

  const handleClearTracker = () => {
    handleClearHistory(); 
    setIsTrackerOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-20 selection:bg-teal-100 selection:text-teal-900 relative transition-colors duration-300">
      <Header 
        onOpenProfile={() => setIsProfileOpen(true)} 
        onNewChat={handleNewChatClick}
        onOpenPlanner={() => setIsPlannerOpen(true)}
        hasActivePlan={!!treatmentPlan}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* History FAB */}
      <button
        onClick={() => setIsHistoryOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-white dark:bg-slate-800 p-4 rounded-full shadow-2xl text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:scale-110 transition-all border border-teal-50 dark:border-slate-700 group hover:rotate-12 duration-300"
        aria-label="View History"
      >
        <History size={26} strokeWidth={2.5} />
        <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-gray-900 dark:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 whitespace-nowrap pointer-events-none shadow-xl">
          Recent Scans
        </span>
      </button>

      {/* Generating Planner Overlay */}
      {isGeneratingPlan && (
        <div className="fixed inset-0 z-[80] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-2xl border border-teal-100 dark:border-slate-700 flex flex-col items-center gap-4">
             <div className="relative">
               <div className="w-16 h-16 border-4 border-teal-100 dark:border-slate-600 border-t-teal-500 rounded-full animate-loader-spin"></div>
               <div className="absolute inset-0 flex items-center justify-center">
                 <Loader2 className="text-teal-500 animate-pulse" size={24} />
               </div>
             </div>
             <p className="font-bold text-gray-700 dark:text-gray-200 text-lg">Designing your routine...</p>
             <p className="text-gray-400 dark:text-gray-500 text-sm">Personalizing based on your profile and results</p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-gray-900/90 dark:bg-slate-800/90 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in-up backdrop-blur-md">
           {isCachedToast ? <Zap size={20} className="text-yellow-400" /> : <CheckCircle2 size={20} className="text-emerald-400" />}
           <span className="font-medium text-sm">
              {toastMessage}
           </span>
        </div>
      )}

      <main className="container mx-auto px-4 pt-6 md:pt-10">
        {!currentResult && loadingState === 'idle' && (
          <div className="text-center mb-10 space-y-4 max-w-2xl mx-auto animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
              Your Personal <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-600 dark:from-teal-400 dark:to-emerald-500">Health Companion</span>
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
              Upload a meal photo for nutrition stats, check skin products for safety, or ask any health question.
            </p>
          </div>
        )}

        <div className="flex flex-col items-center gap-8 md:gap-12">
          {/* Input Section */}
          <InputSection 
            key={chatId} 
            onAnalyze={handleAnalyze} 
            isLoading={loadingState === 'analyzing'} 
            cooldown={cooldownSeconds}
            autoFocus={true}
            onOpenSymptomTracker={() => setIsCompareModalOpen(true)}
          />

          {error && (
            <div className="w-full max-w-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl border border-red-200 dark:border-red-800 text-center animate-shake flex items-center justify-center gap-2 shadow-sm">
              <span role="img" aria-label="alert">⚠️</span>
              <span className="font-medium">{error}</span>
            </div>
          )}

          <ResultCards 
            result={currentResult} 
            isLoading={loadingState === 'analyzing'} 
            history={history}
            onCreatePlanner={handleCreatePlanner}
            onToggleZoneMap={() => setIsZoneMapOpen(!isZoneMapOpen)}
            isZoneMapOpen={isZoneMapOpen}
            hasImages={currentImages.length > 0}
          />

          {/* Skin Zone Map Component - Uses primary image */}
          {currentResult && currentImages.length > 0 && (
             <SkinZoneMap 
               images={currentImages} // Pass all images
               facts={currentResult.cards.find(c => c.type === 'facts')?.content || ''}
               isOpen={isZoneMapOpen}
               onClose={() => setIsZoneMapOpen(false)}
             />
          )}

          {/* Trigger Prediction Card */}
          {currentResult && (
             <TriggerCard 
                currentResult={currentResult}
                selectedTriggers={activeTriggers}
                suggestions={triggerSuggestions}
                onToggleTrigger={handleToggleTrigger}
                onRefine={handleRefineAnalysis}
                isLoading={isRefining}
                isVisible={isTriggerCardVisible}
                onToggleVisibility={() => setIsTriggerCardVisible(!isTriggerCardVisible)}
             />
          )}
        </div>
      </main>

      {/* Existing History-Based Tracker */}
      <SymptomTracker 
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        history={history}
        onClear={handleClearTracker}
      />

      {/* New Two-Image Comparison Modal */}
      <SymptomCompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
      />

      {/* Treatment Planner Modal */}
      {treatmentPlan && (
        <TreatmentPlannerModal
          isOpen={isPlannerOpen}
          onClose={() => setIsPlannerOpen(false)}
          plan={treatmentPlan}
          onUpdatePlan={setTreatmentPlan}
        />
      )}

      <HistoryDrawer 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        history={history}
        isLoading={isHistoryLoading}
        onSelect={handleSelectHistory}
        onClearHistory={handleClearHistory}
        onDeleteItem={handleDeleteItem}
      />

      <ProfileModal 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={userProfile}
        onSave={handleSaveProfile}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <NewChatModal 
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onConfirm={handleConfirmNewChat}
      />
    </div>
  );
};

export default App;
