import React, { useState } from 'react';
import {
  Settings,
  Radio,
  Sparkles,
  Volume2,
  Subtitles,
  CheckCircle2,
  AlertCircle,
  Play,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { SystemHealth, VoiceId } from '../types/project.ts';

interface SettingsViewProps {
  systemStatus: SystemHealth | null;
  onRefreshStatus: () => void;
  onTestGroq: (customKey?: string) => Promise<{ success: boolean; message: string; data?: any }>;
  onPreviewVoice: (voiceId: VoiceId) => Promise<string | null>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  systemStatus,
  onRefreshStatus,
  onTestGroq,
  onPreviewVoice,
}) => {
  const [testingGroq, setTestingGroq] = useState(false);
  const [groqTestResult, setGroqTestResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);

  const [testingVoiceId, setTestingVoiceId] = useState<VoiceId>('my-MM-NilarNeural');
  const [testingVoiceLoading, setTestingVoiceLoading] = useState(false);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);

  const handleRunGroqTest = async () => {
    setTestingGroq(true);
    setGroqTestResult(null);
    try {
      const res = await onTestGroq();
      setGroqTestResult(res);
    } catch (err: any) {
      setGroqTestResult({ success: false, message: err.message || 'Groq connection failed' });
    } finally {
      setTestingGroq(false);
    }
  };

  const handleTestVoice = async () => {
    setTestingVoiceLoading(true);
    try {
      const url = await onPreviewVoice(testingVoiceId);
      if (url) {
        setVoiceAudioUrl(url);
      }
    } catch (err) {
      console.error('Voice test error:', err);
    } finally {
      setTestingVoiceLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">စနစ်ပြင်ဆင်ချက်များနှင့် API သော့များ</h1>
          <p className="text-xs text-slate-400">
            Groq Whisper, Gemini API နှင့် မြန်မာအသံထွက် TTS စနစ် ချိတ်ဆက်မှု အခြေအနေများ
          </p>
        </div>

        <button
          onClick={onRefreshStatus}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
          ပြန်စစ်ဆေးမည်
        </button>
      </div>

      {/* Services Status Cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          ဝန်ဆောင်မှုများနှင့် AI စနစ်များ စစ်ဆေးချက်
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Groq Whisper */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-sm text-white">Groq Whisper Large V3</h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    systemStatus?.groqKeyConfigured
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                  }`}
                >
                  {systemStatus?.groqKeyConfigured ? 'ချိတ်ဆက်ထားသည်' : 'သော့ မထည့်ရသေး'}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                တရုတ်ရုပ်ရှင်များမှ စကားပြောများကို မြန်နှုန်းမြင့် တိကျစွာ စာသားပြောင်းပေးသော Speech-to-Text စနစ်
              </p>
              <div className="mt-2 text-[11px] font-mono text-purple-300">
                Secret: GROQ_API_KEY
              </div>
            </div>

            <button
              onClick={handleRunGroqTest}
              disabled={testingGroq}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Radio className={`w-3.5 h-3.5 ${testingGroq ? 'animate-spin' : ''}`} />
              {testingGroq ? 'ချိတ်ဆက်မှု စမ်းသပ်နေသည်...' : 'Groq Whisper တိုက်ရိုက် စမ်းသပ်မည်'}
            </button>
          </div>

          {/* Gemini AI */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold text-sm text-white">Google Gemini 3.8 Flash</h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    systemStatus?.geminiKeyConfigured
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                  }`}
                >
                  {systemStatus?.geminiKeyConfigured ? 'ချိတ်ဆက်ထားသည်' : 'သော့ မထည့်ရသေး'}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                ရုပ်ထွက် OCR စာတန်းထိုး ဖတ်ရှုခြင်း၊ ဇာတ်လမ်းနားလည်မှုနှင့် မြန်မာဇာတ်လမ်းပြော ရေးသားခြင်း AI စနစ်
              </p>
              <div className="mt-2 text-[11px] font-mono text-blue-300">
                Secret: GEMINI_API_KEY
              </div>
            </div>

            <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400">
              AI Studio အလိုအလျောက် စီမံခန့်ခွဲမှုဖြင့် ချိတ်ဆက်ထားပါသည်
            </div>
          </div>

          {/* Edge Burmese TTS */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-sm text-white">Edge Neural Burmese TTS</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                  အဆင်သင့်ဖြစ်သည်
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                နီလာ (Nilar - Female) နှင့် သီဟ (Thiha - Male) သဘာဝကျသော မြန်မာအသံထွက် ဇာတ်လမ်းပြော စနစ်
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={testingVoiceId}
                  onChange={(e) => setTestingVoiceId(e.target.value as VoiceId)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                >
                  <option value="my-MM-NilarNeural">နီလာ (Nilar - Female)</option>
                  <option value="my-MM-ThihaNeural">သီဟ (Thiha - Male)</option>
                </select>
                <button
                  onClick={handleTestVoice}
                  disabled={testingVoiceLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
                >
                  {testingVoiceLoading ? 'ဖန်တီးဆဲ...' : 'အသံစမ်းမည်'}
                </button>
              </div>

              {voiceAudioUrl && (
                <audio controls autoPlay src={voiceAudioUrl} className="w-full h-8" />
              )}
            </div>
          </div>

          {/* FFmpeg & Fonts */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Subtitles className="w-5 h-5 text-yellow-400" />
                  <h3 className="font-bold text-sm text-white">FFmpeg & Noto Sans Myanmar</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                  တပ်ဆင်ပြီးပါပြီ
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                ဗီဒီယိုနှင့် မြန်မာအသံ ပေါင်းစပ်ခြင်း၊ မြန်မာစာတန်းထိုးများကို ဗီဒီယိုပေါ်တွင် ကြည်လင်ပြတ်သားစွာ ရေးထိုးခြင်း
              </p>
            </div>

            <div className="text-[11px] text-slate-400 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              ဗီဒီယို Encodes: libx264, aac, subtitles filter အဆင်သင့်ရှိပါသည်
            </div>
          </div>
        </div>
      </div>

      {/* Groq Live Test Feedback Modal / Box */}
      {groqTestResult && (
        <div
          className={`p-5 rounded-2xl border ${
            groqTestResult.success
              ? 'bg-emerald-950/30 border-emerald-700/50'
              : 'bg-amber-950/30 border-amber-700/50'
          }`}
        >
          <div className="flex items-start gap-3">
            {groqTestResult.success ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-2 flex-1">
              <h3 className="font-bold text-sm text-white">Groq Whisper စမ်းသပ်မှု ရလဒ်</h3>
              <p className="text-xs text-slate-200">{groqTestResult.message}</p>

              {groqTestResult.data && (
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-purple-300 space-y-1">
                  <div>Model: {groqTestResult.data.model}</div>
                  <div>Language: {groqTestResult.data.language}</div>
                  <div>Duration: {groqTestResult.data.duration}s</div>
                  <div>Transcription output: {groqTestResult.data.receivedText}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* API Key Configuration Guide */}
      <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-sm text-white">API သော့များ ထည့်သွင်းနည်း လမ်းညွှန်</h3>
        </div>

        <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
          <p>
            ၁။ <strong className="text-purple-300">GROQ_API_KEY</strong>: Groq console (console.groq.com) မှ အခမဲ့ API Key ရယူပြီး Google AI Studio ၏ <strong>Settings &gt; Secrets</strong> panel တွင် <code className="bg-slate-800 px-1.5 py-0.5 rounded text-purple-300">GROQ_API_KEY</code> အဖြစ် ထည့်သွင်းပေးပါ။
          </p>
          <p>
            ၂။ <strong className="text-blue-300">GEMINI_API_KEY</strong>: Google AI Studio တွင် စတင်သည်နှင့် အလိုအလျောက် သတ်မှတ်ပေးပြီး ဖြစ်ပါသည်။
          </p>
          <p>
            ၃။ လုံခြုံရေးအရ မည်သည့် API Key ကိုမျှ Browser / Frontend သို့ တိုက်ရိုက် ပြန်လည်မပို့ဘဲ Server-Side တွင်သာ လုံခြုံစွာ ထိန်းသိမ်းထားပါသည်။
          </p>
        </div>
      </div>
    </div>
  );
};
