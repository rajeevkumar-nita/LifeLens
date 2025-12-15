
import React, { useState, useEffect } from 'react';
import { TreatmentPlan, RoutineItem } from '../types';
import { 
  X, Sun, Moon, Calendar, AlertOctagon, CheckSquare, Square, 
  Info, Download, Bell, Save, ShieldCheck, Activity, Printer, AlertTriangle
} from 'lucide-react';

interface TreatmentPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: TreatmentPlan;
  onUpdatePlan: (plan: TreatmentPlan) => void;
}

export const TreatmentPlannerModal: React.FC<TreatmentPlannerModalProps> = ({ 
  isOpen, onClose, plan, onUpdatePlan 
}) => {
  const [activeTab, setActiveTab] = useState<'morning' | 'night' | 'weekly'>('morning');
  const [showReminderToast, setShowReminderToast] = useState(false);

  if (!isOpen) return null;

  const toggleItem = (section: 'morning' | 'night' | 'weekly' | 'avoidance', id: string) => {
    const updatedSection = plan[section].map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    onUpdatePlan({ ...plan, [section]: updatedSection });
  };

  const handleSetReminder = () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications");
      return;
    }

    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification("LifeLens Routine Reminder", {
          body: "It's time for your skin care routine!",
          icon: "/favicon.ico" // assuming default
        });
        setShowReminderToast(true);
        setTimeout(() => setShowReminderToast(false), 3000);
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const renderChecklist = (items: RoutineItem[], section: 'morning' | 'night' | 'weekly' | 'avoidance') => (
    <div className="space-y-3">
      {items.map((item) => (
        <div 
          key={item.id} 
          className={`flex gap-3 p-4 rounded-xl border transition-all duration-200 group
            ${item.completed 
              ? 'bg-teal-50/50 dark:bg-teal-900/10 border-teal-100 dark:border-teal-900/30 opacity-75' 
              : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-800 hover:shadow-sm'}`}
        >
          <button 
            onClick={() => toggleItem(section, item.id)}
            className={`flex-shrink-0 mt-0.5 text-teal-600 dark:text-teal-400 transition-transform active:scale-90`}
            aria-label={item.completed ? "Mark as incomplete" : "Mark as complete"}
          >
            {item.completed ? <CheckSquare size={22} /> : <Square size={22} />}
          </button>
          
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className={`font-bold text-gray-800 dark:text-gray-200 ${item.completed ? 'line-through text-gray-500 dark:text-gray-500' : ''}`}>
                {item.title}
              </h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider
                ${item.effort === 'Low' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 
                  item.effort === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'}`}>
                {item.effort} Effort
              </span>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-start gap-1.5 leading-relaxed">
              <Info size={12} className="mt-0.5 text-teal-500 flex-shrink-0" />
              {item.rationale}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-4 print:p-0 print:static print:bg-white">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity animate-fade-in print:hidden"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="bg-white dark:bg-slate-900 w-full h-full sm:max-w-4xl sm:h-[90vh] sm:rounded-[32px] shadow-2xl relative z-10 flex flex-col overflow-hidden animate-fade-in-scale print:shadow-none print:w-full print:h-auto print:rounded-none">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 print:border-none transition-colors duration-300">
          <div className="flex items-center gap-3">
             <div className="bg-gradient-to-br from-teal-400 to-emerald-500 p-2.5 rounded-xl text-white shadow-lg shadow-teal-500/20 print:hidden">
               <ShieldCheck size={24} />
             </div>
             <div>
               <h2 className="text-xl font-bold text-gray-900 dark:text-white">Treatment Planner</h2>
               <div className="flex items-center gap-1.5 mt-0.5">
                  <ShieldCheck size={12} className="text-teal-600 dark:text-teal-400 print:hidden" />
                  <p className="text-xs text-teal-700 dark:text-teal-300 font-bold uppercase tracking-wide print:hidden">Safe, Non-medical Guidance</p>
               </div>
             </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button onClick={handlePrint} className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Print / Save PDF">
              <Printer size={20} />
            </button>
            <button onClick={onClose} className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-slate-950/50 p-6 md:p-8 custom-scrollbar print:overflow-visible print:bg-white print:p-0 transition-colors duration-300">
          
          {/* Prominent Safety Disclaimer */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl flex items-start gap-3 mb-6 print:mb-4">
             <AlertTriangle className="text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" size={18} />
             <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed font-medium">
                This planner is non-medical and for general skin-care guidance only. 
                I am an AI assistant, not a medical professional. Please consult a doctor for medical advice.
             </p>
          </div>

          {/* Summary Section */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm mb-8 print:border print:border-gray-200 transition-colors duration-300">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                   <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Skin Type</span>
                   <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{plan.skinType}</p>
                </div>
                <div>
                   <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Key Symptoms</span>
                   <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{plan.topSymptoms.join(", ")}</p>
                </div>
                <div>
                   <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Severity</span>
                   <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${plan.severityLevel === 'Severe' ? 'bg-red-500' : plan.severityLevel === 'Moderate' ? 'bg-orange-500' : 'bg-green-500'}`} />
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{plan.severityLevel}</p>
                   </div>
                </div>
                <div>
                   <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Confidence</span>
                   <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{plan.confidence}</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Left Column: Routines */}
             <div className="lg:col-span-2 space-y-6">
                
                {/* Tabs (Mobile/Desktop) */}
                <div className="flex p-1 bg-gray-200/50 dark:bg-slate-800 rounded-xl w-full sm:w-fit mb-4 print:hidden">
                   {(['morning', 'night', 'weekly'] as const).map((tab) => (
                     <button
                       key={tab}
                       onClick={() => setActiveTab(tab)}
                       className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all duration-200 flex items-center gap-2 justify-center
                         ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                     >
                       {tab === 'morning' && <Sun size={16} />}
                       {tab === 'night' && <Moon size={16} />}
                       {tab === 'weekly' && <Calendar size={16} />}
                       {tab}
                     </button>
                   ))}
                </div>

                {/* Visible Routine Content (Tabbed view for screen, All for print) */}
                <div className="space-y-8">
                  <div className={`${activeTab === 'morning' ? 'block' : 'hidden'} print:block`}>
                     <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                       <Sun className="text-orange-400" size={20} /> Morning Routine
                     </h3>
                     {renderChecklist(plan.morning, 'morning')}
                  </div>

                  <div className={`${activeTab === 'night' ? 'block' : 'hidden'} print:block`}>
                     <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                       <Moon className="text-indigo-400" size={20} /> Night Routine
                     </h3>
                     {renderChecklist(plan.night, 'night')}
                  </div>

                  <div className={`${activeTab === 'weekly' ? 'block' : 'hidden'} print:block`}>
                     <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                       <Calendar className="text-teal-400" size={20} /> Weekly Deep-Clean
                     </h3>
                     {renderChecklist(plan.weekly, 'weekly')}
                  </div>
                </div>

             </div>

             {/* Right Column: Avoidance & Tips */}
             <div className="space-y-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-6">
                   <h3 className="text-red-800 dark:text-red-200 font-bold mb-4 flex items-center gap-2">
                      <AlertOctagon size={20} /> Trigger Avoidance
                   </h3>
                   {renderChecklist(plan.avoidance, 'avoidance')}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-6 print:hidden">
                   <h3 className="text-blue-800 dark:text-blue-200 font-bold mb-3 flex items-center gap-2">
                      <Activity size={20} /> Pro Tip
                   </h3>
                   <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                     Consistency is key. Try to stick to this routine for at least 2 weeks to see visible improvements. Take progress photos using the Symptom Tracker.
                   </p>
                </div>
             </div>
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-12 print:mt-8">
             I am an AI assistant, not a medical professional. Please consult a doctor for medical advice.
          </p>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center print:hidden transition-colors duration-300">
           <button 
             onClick={handleSetReminder}
             className="flex items-center gap-2 px-4 py-3 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-xl transition-colors font-bold text-sm"
           >
             <Bell size={18} />
             Set Daily Reminder
           </button>

           <div className="flex gap-3">
             <button 
               onClick={onClose}
               className="px-6 py-3 bg-gray-900 dark:bg-slate-700 text-white rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-slate-600 transition-all text-sm shadow-lg shadow-gray-200 dark:shadow-none"
             >
               Save & Close
             </button>
           </div>
        </div>

        {/* Toast Notification */}
        {showReminderToast && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-xl animate-fade-in-up flex items-center gap-2">
             <Bell size={16} className="text-teal-400" /> Reminder Set!
          </div>
        )}

      </div>
    </div>
  );
};
