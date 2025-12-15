
import React, { useState, useEffect } from 'react';
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

// Helper to generate a unique session ID
const generateChatId = () => `lifelens_chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const App: React.FC = () => {
  // Theme Hook
  const { theme, toggleTheme } = useTheme();

  // Session State
  const [chatId, setChatId] = useState<string>(generateChatId);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null); // Store current image for zone mapping
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  
  // Chat-Scoped History State
  const [history, setHistory] = useState<HistoryItem[]>(DEFAULT_HISTORY);
  
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tracker State (History-based)
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);

  // New Two-Image Comparison State
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // New Chat UI State
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isCachedToast, setIsCachedToast] = useState(false);

  // Treatment Planner State
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Trigger Prediction State
  const [activeTriggers, setActiveTriggers] = useState<string[]>([]);
  const [triggerSuggestions, setTriggerSuggestions] = useState<string | null>(null);
  const [isTriggerCardVisible, setIsTriggerCardVisible] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  // Zone Map State
  const [isZoneMapOpen, setIsZoneMapOpen] = useState(false);

  // Load Global User Profile (Once on Mount)
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('lifelens_profile');
      if (savedProfile) {
        setUserProfile(JSON.parse(savedProfile));
      }
    } catch (e) {
      console.error("Failed to load profile from local storage", e);
    }
  }, []);

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

  // Confirm New Chat: Reset everything
  const handleConfirmNewChat = () => {
    // 1. Clear current session storage
    const oldSessionKey = `lifelens_history_${chatId}`;
    const oldPlanKey = `lifelens_plan_${chatId}`;
    localStorage.removeItem(oldSessionKey);
    localStorage.removeItem(oldPlanKey);

    // 2. Generate new session ID
    const newChatId = generateChatId();
    setChatId(newChatId);

    // 3. Reset UI State
    setHistory([]);
    setCurrentResult(null);
    setCurrentImage(null);
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

  const handleSaveProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('lifelens_profile', JSON.stringify(profile));
  };

  const handleAnalyze = async (text: string, image: string | null) => {
    setLoadingState('analyzing');
    setError(null);
    setCurrentResult(null);
    setCurrentImage(image);
    setActiveTriggers([]); // Reset triggers on new analysis
    setTriggerSuggestions(null);
    setIsTriggerCardVisible(false);
    setIsZoneMapOpen(false);

    try {
      const result = await analyzeHealthQuery(text, image || undefined, userProfile);
      
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
        imageUrl: image || undefined,
        query: text || (image ? 'Image Analysis' : 'Query'),
        result: result,
      };

      setHistory(prev => [newHistoryItem, ...prev]); 
      
    } catch (err: any) {
      console.error(err);
      
      let errorMessage = "Failed to analyze. Please try again.";
      if (err instanceof Error || (typeof err === 'object' && err !== null && 'message' in err)) {
        const msg = (err.message || '').toLowerCase();
        if (msg.includes('fetch failed') || msg.includes('network')) {
          errorMessage = "Network error. Please check your internet connection.";
        } else if (msg.includes('safety') || msg.includes('blocked')) {
          errorMessage = "Request blocked by safety filters. Please try a different image or prompt.";
        }
      }
      setError(errorMessage);
      setLoadingState('error');
    }
  };

  const handleCreatePlanner = async () => {
    if (!currentResult) return;
    
    setIsGeneratingPlan(true);
    try {
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
    
    setIsRefining(true);
    try {
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
    setCurrentImage(item.imageUrl || null);
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
          />

          {/* Skin Zone Map Toggle (Only for Skincare) */}
          {currentResult && currentImage && (currentResult.category === 'Skincare' || currentResult.category === 'General') && (
            <div className="w-full max-w-3xl flex justify-center -mt-4 mb-2 animate-fade-in">
              <button 
                onClick={() => setIsZoneMapOpen(!isZoneMapOpen)}
                className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-700 shadow-sm transition-all group"
              >
                <ScanFace size={18} className="group-hover:scale-110 transition-transform" />
                {isZoneMapOpen ? "Hide Zone Map" : "Show Skin Zone Map"}
              </button>
            </div>
          )}

          {/* Skin Zone Map Component */}
          {currentResult && currentImage && (
             <SkinZoneMap 
               image={currentImage}
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
