
import React from 'react';
import { Activity, User, PlusCircle, ShieldCheck, Sun, Moon } from 'lucide-react';
import { Theme } from '../hooks/useTheme';

interface HeaderProps {
  onOpenProfile?: () => void;
  onNewChat?: () => void;
  onOpenPlanner?: () => void;
  hasActivePlan?: boolean;
  theme?: Theme;
  toggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenProfile, onNewChat, onOpenPlanner, hasActivePlan, theme, toggleTheme 
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-colors duration-300 border-b border-transparent dark:border-slate-800">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-20 sm:h-24 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left Area: New Chat */}
        <div className="flex-1 flex items-center justify-start min-w-0">
          {onNewChat && (
             <button 
              onClick={onNewChat}
              className="flex items-center justify-center gap-2 p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-slate-700 hover:text-teal-600 dark:hover:text-teal-400 transition-all duration-200 hover:shadow-md border border-gray-100 dark:border-slate-700 group shrink-0"
              title="New Chat / Reset Session"
              aria-label="Start New Chat"
            >
              <PlusCircle size={20} className="text-current" strokeWidth={2.5} />
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider whitespace-nowrap">New Chat</span>
            </button>
          )}
        </div>

        {/* Center Area: Logo */}
        <div className="shrink-0 flex items-center justify-center">
          <div className="flex items-center gap-3 select-none">
            <div className="bg-gradient-to-tr from-teal-500 to-emerald-500 p-2.5 rounded-2xl text-white shadow-lg shadow-teal-500/20 shrink-0">
              <Activity size={24} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-800 dark:text-white tracking-tight hidden md:block transition-colors whitespace-nowrap animate-fade-in">
              LifeLens
            </h1>
          </div>
        </div>

        {/* Right Area: Controls */}
        <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 min-w-0">
          {hasActivePlan && onOpenPlanner && (
            <button
              onClick={onOpenPlanner}
              className="flex items-center justify-center gap-2 p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all duration-200 shadow-sm border border-teal-100 dark:border-teal-800/50 group shrink-0 animate-fade-in"
              title="Open Treatment Planner"
              aria-label="Open Treatment Planner"
            >
               <ShieldCheck size={20} strokeWidth={2.5} />
               {/* Show text only on large screens to prevent overlap */}
               <span className="hidden lg:inline text-xs font-bold uppercase tracking-wider whitespace-nowrap">Planner</span>
            </button>
          )}

          {/* Theme Toggle */}
          {toggleTheme && (
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all duration-200 border border-gray-100 dark:border-slate-700 group shrink-0"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              aria-label="Toggle dark mode"
              aria-pressed={theme === 'dark'}
            >
              {theme === 'dark' ? (
                <Moon size={20} className="text-current" />
              ) : (
                <Sun size={20} className="text-current" />
              )}
            </button>
          )}

          {onOpenProfile && (
            <button 
              onClick={onOpenProfile}
              className="flex items-center justify-center gap-2 p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-slate-700 hover:text-teal-600 dark:hover:text-teal-400 transition-all duration-200 hover:shadow-md border border-gray-100 dark:border-slate-700 group shrink-0"
              title="Medical Profile & Settings"
              aria-label="Open Profile"
            >
              <div className="bg-white dark:bg-slate-700 p-0.5 rounded-full shadow-sm group-hover:scale-105 transition-transform">
                <User size={18} className="text-current" />
              </div>
              {/* Show text only on extra large screens */}
              <span className="hidden xl:inline text-xs font-bold uppercase tracking-wider whitespace-nowrap">Profile</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Gradient Underline */}
      <div className="absolute bottom-0 w-full h-[1px] bg-gradient-to-r from-transparent via-teal-200/50 dark:via-teal-500/20 to-transparent"></div>
    </header>
  );
};
