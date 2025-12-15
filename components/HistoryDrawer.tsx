
import React, { useState, useEffect } from 'react';
import { HistoryItem } from '../types';
import { 
  X, Clock, ChevronRight, Trash2, AlertCircle, Download, FileJson, 
  Image as ImageIcon, Utensils, Droplet, Pill, AlertTriangle, Activity 
} from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  isLoading?: boolean;
  onSelect: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onDeleteItem?: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ 
  isOpen, onClose, history, isLoading = false, onSelect, onClearHistory, onDeleteItem 
}) => {
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  useEffect(() => {
    if (!isOpen) setIsConfirmingClear(false);
  }, [isOpen]);

  const handleClear = () => {
    onClearHistory();
    setIsConfirmingClear(false);
  };

  const handleDeleteSingle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onDeleteItem) onDeleteItem(id);
  };

  const handleExportCsv = () => {
    if (history.length === 0) return;
    const headers = ['Date', 'Time', 'Query', 'Category', 'Result'];
    const csvContent = [
      headers.join(','),
      ...history.map(item => {
        const date = new Date(item.timestamp);
        const resultSummary = item.result.cards.map(c => `${c.title}: ${c.content}`).join(' | ');
        return [
          `"${date.toLocaleDateString()}"`,
          `"${date.toLocaleTimeString()}"`,
          `"${(item.query || '').replace(/"/g, '""')}"`,
          `"${item.result.category}"`,
          `"${resultSummary.replace(/"/g, '""')}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lifelens_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJson = () => {
    if (history.length === 0) return;
    const jsonContent = JSON.stringify(history, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lifelens_history_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Nutrition': return <Utensils size={10} strokeWidth={2.5} className="mr-1" />;
      case 'Skincare': return <Droplet size={10} strokeWidth={2.5} className="mr-1" />;
      case 'Medicine': return <Pill size={10} strokeWidth={2.5} className="mr-1" />;
      case 'Alert': return <AlertTriangle size={10} strokeWidth={2.5} className="mr-1" />;
      default: return <Activity size={10} strokeWidth={2.5} className="mr-1" />;
    }
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/20 dark:bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white dark:bg-slate-900 z-50 shadow-2xl transform transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col bg-gray-50/50 dark:bg-slate-900/50">
          {/* Header */}
          <div className={`p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10 transition-colors duration-300 ${isConfirmingClear ? 'bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-slate-900'}`}>
            {isConfirmingClear ? (
              <div className="w-full flex flex-col gap-3 animate-fade-in">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle size={18} />
                  <span className="text-sm font-semibold">Delete all history?</span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => setIsConfirmingClear(false)}
                    className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleClear}
                    className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-gray-800 dark:text-white">
                  <Clock size={20} className="text-teal-600 dark:text-teal-400" />
                  <h2 className="text-xl font-bold tracking-tight">Recent Scans</h2>
                </div>
                <div className="flex items-center gap-1">
                  {!isLoading && history.length > 0 && (
                    <>
                      <button onClick={handleExportCsv} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-colors" title="Export CSV">
                        <Download size={18} />
                      </button>
                      <button onClick={handleExportJson} className="p-2 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-full transition-colors" title="Export JSON">
                        <FileJson size={18} />
                      </button>
                      <button onClick={() => setIsConfirmingClear(true)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-full transition-colors mr-1" title="Clear All">
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                  <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-400">
                    <X size={24} />
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 p-4 border border-gray-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-800 animate-pulse">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-xl"></div>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-4 opacity-50">
                <div className="bg-gray-100 dark:bg-slate-800 p-6 rounded-full">
                  <Clock size={40} className="text-gray-300 dark:text-gray-600" />
                </div>
                <p className="font-medium">No recent scans</p>
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 hover:shadow-lg hover:border-teal-100 dark:hover:border-teal-900 cursor-pointer transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="flex gap-4 items-start">
                    {item.imageUrl ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700 flex-shrink-0 border border-gray-100 dark:border-slate-700 shadow-sm">
                        <img src={item.imageUrl} alt="scan" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-teal-50/50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0 text-teal-400 border border-teal-50 dark:border-teal-900">
                        <ImageIcon size={24} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex justify-between items-start mb-1">
                         <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide flex items-center
                              ${item.result.category === 'Nutrition' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 
                                item.result.category === 'Skincare' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                item.result.category === 'Medicine' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                                item.result.category === 'Alert' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'}`}
                        >
                          {getCategoryIcon(item.result.category)}
                          {item.result.category}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                           {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate leading-tight">
                        {item.query || "Image Analysis"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute right-4 bottom-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {onDeleteItem && (
                      <button
                        onClick={(e) => handleDeleteSingle(e, item.id)}
                        className="p-1.5 bg-red-50 dark:bg-red-900/40 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors shadow-sm"
                        title="Delete Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <div className="p-1.5 bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 rounded-lg shadow-sm">
                       <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};
