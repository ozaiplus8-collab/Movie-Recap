import React, { useState } from 'react';
import {
  Film,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  Radio,
  FileText,
  Volume2,
  Subtitles,
  ExternalLink,
  Trash2,
  Play
} from 'lucide-react';
import { RecapProject, SystemHealth } from '../types/project.ts';

interface DashboardViewProps {
  projects: RecapProject[];
  counts: { total: number; completed: number; processing: number; failed: number };
  systemStatus: SystemHealth | null;
  onNavigateCreate: () => void;
  onNavigateSettings: () => void;
  onSelectProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onTestGroq: () => void;
  groqTesting: boolean;
  groqTestResult: { success: boolean; message: string; data?: any } | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  counts,
  systemStatus,
  onNavigateCreate,
  onNavigateSettings,
  onSelectProject,
  onDeleteProject,
  onTestGroq,
  groqTesting,
  groqTestResult,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('ဤပရောဂျက်ကို ဖျက်ပစ်ရန် သေချာပါသလား?')) {
      onDeleteProject(id);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border border-purple-800/30 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-60 h-60 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            AI Movie Recap Studio • တရုတ်မှ မြန်မာသို့
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            တရုတ်ရုပ်ရှင်များကို မြန်မာလို အသံထွက် ဇာတ်လမ်းပြော ဗီဒီယိုအဖြစ် ပြောင်းလဲပါ
          </h1>

          <p className="text-sm sm:text-base text-slate-300 mb-6 leading-relaxed">
            တရုတ်ဗီဒီယို ထည့်သွင်းရုံဖြင့် Groq Whisper ဖြင့် တရုတ်စကားပြောများကို နားထောင်ခြင်း၊
            Gemini Vision ဖြင့် စာတန်းထိုး ဖတ်ရှုခြင်း၊ ဆွဲဆောင်မှုရှိသော မြန်မာဇာတ်ညွှန်း ရေးသားခြင်း၊
            သဘာဝကျသော မြန်မာအသံထွက်နှင့် အချိန်ကိုက် စာတန်းထိုး (.SRT) ထည့်သွင်းကာ
            အပြီးသတ် MP4 ဗီဒီယိုအဖြစ် အလိုအလျောက် ထုတ်လုပ်ပေးပါသည်။
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onNavigateCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/25 transition-all transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              Recap အသစ် စတင်ဖန်တီးမည်
            </button>

            <button
              onClick={onTestGroq}
              disabled={groqTesting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-200 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 transition-all"
            >
              <Radio className={`w-4 h-4 text-purple-400 ${groqTesting ? 'animate-spin' : ''}`} />
              {groqTesting ? 'Groq Whisper စမ်းသပ်နေသည်...' : 'Groq Whisper စစ်ဆေးမည်'}
            </button>
          </div>

          {/* Real Groq Test Result Feedback */}
          {groqTestResult && (
            <div
              className={`mt-4 p-3 rounded-xl text-xs sm:text-sm border flex items-start gap-2.5 ${
                groqTestResult.success
                  ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-200'
                  : 'bg-amber-950/40 border-amber-700/50 text-amber-200'
              }`}
            >
              {groqTestResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{groqTestResult.message}</p>
                {groqTestResult.data && (
                  <p className="text-xs text-slate-400 mt-1">
                    မော်ဒယ်: {groqTestResult.data.model} | ဘာသာစကား: {groqTestResult.data.language} | အသံကြာချိန်: {groqTestResult.data.duration}s
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">ပရောဂျက် စုစုပေါင်း</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{counts.total}</div>
          <p className="text-xs text-slate-500 mt-1">ဖန်တီးထားသော ဗီဒီယိုများ</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">ပြီးစီးပြီး Recap များ</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{counts.completed}</div>
          <p className="text-xs text-slate-500 mt-1">ဒေါင်းလုဒ် ရယူနိုင်ပါပြီ</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">လုပ်ဆောင်ဆဲ</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-400">{counts.processing}</div>
          <p className="text-xs text-slate-500 mt-1">တရုတ်စကားပြော / အသံသွင်းဆဲ</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">အာရုံစိုက်ရန် / အမှား</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400">{counts.failed}</div>
          <p className="text-xs text-slate-500 mt-1">ပြန်လည်ကြိုးစားနိုင်ပါသည်</p>
        </div>
      </div>

      {/* System Engine Status Card */}
      <div className="rounded-xl bg-slate-900/40 border border-slate-800/80 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">AI Studio စနစ် အခြေအနေ</h2>
            <p className="text-xs text-slate-400">ရုပ်ရှင် Recap ပြုလုပ်ရာတွင် အသုံးပြုသော AI မော်ဒယ်များနှင့် စနစ်များ</p>
          </div>
          <button
            onClick={onNavigateSettings}
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
          >
            အသေးစိတ် စစ်ဆေးရန် <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/60 flex items-start gap-3">
            <Radio className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white">Groq Whisper V3</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    systemStatus?.groqKeyConfigured ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">တရုတ်စကားပြော မှတ်သားခြင်း</p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/60 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white">Gemini 3.8 Flash</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    systemStatus?.geminiKeyConfigured ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">ဇာတ်လမ်းနားလည်မှု & Vision OCR</p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/60 flex items-start gap-3">
            <Volume2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white">Edge Burmese TTS</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">နီလာ & သီဟ မြန်မာအသံထွက်</p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/60 flex items-start gap-3">
            <Subtitles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white">FFmpeg & Noto Font</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">မြန်မာစာတန်းထိုး & MP4 ဗီဒီယို</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Projects Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">လတ်တလော ပရောဂျက်များ</h2>
            <p className="text-xs text-slate-400">မကြာသေးမီက ပြုလုပ်ခဲ့သော တရုတ်ရုပ်ရှင် Recap များ</p>
          </div>
          {projects.length > 0 && (
            <button
              onClick={onNavigateCreate}
              className="text-xs font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" /> အသစ်ထည့်မည်
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center bg-slate-900/20">
            <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300 mb-1">
              ပရောဂျက် မရှိသေးပါ
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              တရုတ်ရုပ်ရှင် ဗီဒီယိုဖိုင် တစ်ခု တင်သွင်းပြီး ပထမဆုံး မြန်မာ Recap ဗီဒီယိုကို ဖန်တီးလိုက်ပါ
            </p>
            <button
              onClick={onNavigateCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-md shadow-purple-600/20"
            >
              <PlusCircle className="w-4 h-4" /> Recap အသစ် ဖန်တီးမည်
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((project) => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="group relative rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-purple-600/40 p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-sm text-slate-200 line-clamp-1 group-hover:text-purple-300 transition-colors">
                    {project.title}
                  </h4>
                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    title="ပရောဂျက် ဖျက်မည်"
                    className="text-slate-500 hover:text-red-400 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-slate-400 line-clamp-1 mb-3">
                  {project.originalFilename}
                </p>

                {/* Progress or Status */}
                {project.status === 'processing' && (
                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between text-[11px] text-purple-400 font-medium">
                      <span>{project.currentStepName}</span>
                      <span>{project.progressPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${project.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {project.durationSeconds ? `${Math.round(project.durationSeconds)} စက္ကန့်` : 'ကြာချိန် မသိရ'}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-full font-medium ${
                      project.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                        : project.status === 'processing'
                        ? 'bg-blue-950 text-blue-400 border border-blue-800/60 animate-pulse'
                        : project.status === 'failed'
                        ? 'bg-red-950 text-red-400 border border-red-800/60'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {project.status === 'completed'
                      ? 'ပြီးစီးပါပြီ'
                      : project.status === 'processing'
                      ? 'လုပ်ဆောင်ဆဲ'
                      : project.status === 'failed'
                      ? 'အမှားရှိသည်'
                      : 'စတင်ရန်'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
