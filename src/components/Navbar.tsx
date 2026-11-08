import React from 'react';
import { Film, PlusCircle, LayoutDashboard, FolderKanban, Settings, Sparkles } from 'lucide-react';

export type NavTab = 'dashboard' | 'create' | 'projects' | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  systemStatus: {
    groqKeyConfigured: boolean;
    geminiKeyConfigured: boolean;
  } | null;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, systemStatus }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 p-0.5 shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Film className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400 bg-clip-text text-transparent">
                  My AI Studio
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60">
                  Movie Recap
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                တရုတ်ရုပ်ရှင် မြန်မာပြန် ဇာတ်လမ်းပြော စတူဒီယို
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              ပင်မစာမျက်နှာ
            </button>

            <button
              onClick={() => onSelectTab('create')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'create'
                  ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-purple-400" />
              Recap အသစ်ဖန်တီးရန်
            </button>

            <button
              onClick={() => onSelectTab('projects')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'projects'
                  ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              ပရောဂျက်များ
            </button>

            <button
              onClick={() => onSelectTab('settings')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'settings'
                  ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-4 h-4" />
              စနစ်ပြင်ဆင်ချက်
            </button>
          </nav>

          {/* Right Action & API status indicator */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab('settings')}
              title="API ချိတ်ဆက်မှု အခြေအနေ"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 transition-colors"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  systemStatus?.groqKeyConfigured && systemStatus?.geminiKeyConfigured
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="hidden sm:inline">
                {systemStatus?.groqKeyConfigured && systemStatus?.geminiKeyConfigured
                  ? 'AI ချိတ်ဆက်ထားသည်'
                  : 'API သော့များ စစ်ဆေးရန်'}
              </span>
            </button>

            <button
              onClick={() => onSelectTab('create')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-600/20 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-purple-200" />
              <span className="hidden xs:inline">စတင်မည်</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export const MobileBottomBar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-lg px-2 py-1 flex justify-around">
      <button
        onClick={() => onSelectTab('dashboard')}
        className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-xs ${
          currentTab === 'dashboard' ? 'text-purple-400 font-semibold' : 'text-slate-400'
        }`}
      >
        <LayoutDashboard className="w-5 h-5 mb-0.5" />
        ပင်မ
      </button>
      <button
        onClick={() => onSelectTab('create')}
        className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-xs ${
          currentTab === 'create' ? 'text-purple-400 font-semibold' : 'text-slate-400'
        }`}
      >
        <PlusCircle className="w-5 h-5 mb-0.5" />
        Recap သစ်
      </button>
      <button
        onClick={() => onSelectTab('projects')}
        className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-xs ${
          currentTab === 'projects' ? 'text-purple-400 font-semibold' : 'text-slate-400'
        }`}
      >
        <FolderKanban className="w-5 h-5 mb-0.5" />
        ပရောဂျက်
      </button>
      <button
        onClick={() => onSelectTab('settings')}
        className={`flex flex-col items-center py-1.5 px-3 rounded-lg text-xs ${
          currentTab === 'settings' ? 'text-purple-400 font-semibold' : 'text-slate-400'
        }`}
      >
        <Settings className="w-5 h-5 mb-0.5" />
        ပြင်ဆင်ချက်
      </button>
    </div>
  );
};
