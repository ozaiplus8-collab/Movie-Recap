import React, { useState, useEffect } from 'react';
import {
  Film,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  RotateCcw,
  Download,
  FileText,
  Volume2,
  Subtitles,
  Edit3,
  Save,
  ArrowLeft,
  Sparkles,
  Radio,
  Eye,
  Check
} from 'lucide-react';
import { RecapProject } from '../types/project.ts';

interface ProjectDetailViewProps {
  projectId: string;
  onBack: () => void;
  onRefreshProject: (id: string) => Promise<RecapProject | null>;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  projectId,
  onBack,
  onRefreshProject,
}) => {
  const [project, setProject] = useState<RecapProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'video' | 'script' | 'chinese' | 'subtitles' | 'export'>('video');

  // Video view mode: 'final' or 'original'
  const [videoMode, setVideoMode] = useState<'final' | 'original'>('final');

  // Script editing
  const [editedScript, setEditedScript] = useState('');
  const [isSavingScript, setIsSavingScript] = useState(false);
  const [scriptSavedToast, setScriptSavedToast] = useState(false);

  // Poll project status while processing
  useEffect(() => {
    let interval: any = null;

    const loadProject = async () => {
      const data = await onRefreshProject(projectId);
      if (data) {
        setProject(data);
        setEditedScript(data.burmeseScript || '');
        if (data.status === 'completed' && data.finalVideoUrl) {
          setVideoMode('final');
        } else if (!data.finalVideoUrl && data.originalVideoUrl) {
          setVideoMode('original');
        }
      }
      setLoading(false);
    };

    loadProject();

    interval = setInterval(() => {
      onRefreshProject(projectId).then((data) => {
        if (data) {
          setProject(data);
          if (data.status !== 'processing') {
            clearInterval(interval);
          }
        }
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [projectId]);

  const handleRetryPipeline = async () => {
    if (!project) return;
    try {
      await fetch(`/api/projects/${project.id}/process-all`, { method: 'POST' });
      setProject({ ...project, status: 'processing', error: undefined });
    } catch (e) {
      console.error('Retry error:', e);
    }
  };

  const handleSaveScript = async () => {
    if (!project) return;
    setIsSavingScript(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/script`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ burmeseScript: editedScript }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setProject(data.project);
        setScriptSavedToast(true);
        setTimeout(() => setScriptSavedToast(false), 3000);
      }
    } catch (err) {
      console.error('Save script error:', err);
    } finally {
      setIsSavingScript(false);
    }
  };

  const handleDownloadScript = () => {
    if (!project?.burmeseScript) return;
    const blob = new Blob([project.burmeseScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '_')}_script.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !project) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-400">ပရောဂျက်ကို ဖွင့်နေပါသည်...</p>
      </div>
    );
  }

  const steps = [
    { num: 1, name: 'တရုတ်အသံ ခွဲထုတ်ခြင်း', desc: 'FFmpeg Audio Extract', done: project.currentStep > 1 || project.status === 'completed' },
    { num: 2, name: 'Groq Whisper စကားပြော မှတ်သားခြင်း', desc: 'Whisper-large-v3', done: project.currentStep > 2 || project.status === 'completed' },
    { num: 3, name: 'စာတန်းထိုးနှင့် မြင်ကွင်း ဖတ်ရှုခြင်း', desc: 'Gemini Vision OCR', done: project.currentStep > 3 || project.status === 'completed' },
    { num: 4, name: 'မြန်မာဇာတ်လမ်းပြော ရေးသားခြင်း', desc: 'Gemini Storytelling AI', done: project.currentStep > 4 || project.status === 'completed' },
    { num: 5, name: 'မြန်မာအသံထွက် ဖန်တီးခြင်း', desc: 'Edge Neural TTS', done: project.currentStep > 5 || project.status === 'completed' },
    { num: 6, name: 'မြန်မာစာတန်းထိုး (.SRT)', desc: 'Burmese Subtitles', done: project.currentStep > 6 || project.status === 'completed' },
    { num: 7, name: 'ဗီဒီယို ပေါင်းစပ်ထုတ်လုပ်ခြင်း', desc: 'FFmpeg Render MP4', done: project.status === 'completed' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Top Navigation & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white line-clamp-1">
              {project.title}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {project.originalFilename} • {project.durationSeconds ? `${Math.round(project.durationSeconds)}s` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {project.status === 'failed' && (
            <button
              onClick={handleRetryPipeline}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 transition-colors shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              ပြန်လည်ကြိုးစားမည်
            </button>
          )}

          {project.finalVideoUrl && (
            <a
              href={project.finalVideoUrl}
              download={`${project.title}_Recap.mp4`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md shadow-emerald-600/20"
            >
              <Download className="w-4 h-4" />
              Recap ဗီဒီယို ဒေါင်းလုဒ် (MP4)
            </a>
          )}
        </div>
      </div>

      {/* Progress & Current Status Banner */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-3 h-3 rounded-full ${
                project.status === 'completed'
                  ? 'bg-emerald-400'
                  : project.status === 'processing'
                  ? 'bg-blue-400 animate-pulse'
                  : project.status === 'failed'
                  ? 'bg-red-400'
                  : 'bg-slate-400'
              }`}
            />
            <span className="font-semibold text-sm text-slate-200">
              {project.currentStepName}
            </span>
          </div>
          <span className="text-xs font-bold text-purple-400">
            {project.progressPercent}% ပြီးစီးပါပြီ
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              project.status === 'failed'
                ? 'bg-red-500'
                : 'bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400'
            }`}
            style={{ width: `${project.progressPercent}%` }}
          />
        </div>

        {project.error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">လုပ်ဆောင်ချက် အမှား:</p>
              <p className="mt-0.5">{project.error}</p>
            </div>
          </div>
        )}

        {/* Step-by-step indicator dots */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-slate-800/60">
          {steps.map((st) => (
            <div
              key={st.num}
              className={`p-2 rounded-lg border text-[11px] ${
                st.done
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                  : project.currentStep === st.num && project.status === 'processing'
                  ? 'bg-purple-950/40 border-purple-600/50 text-purple-300 animate-pulse'
                  : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-1 font-semibold">
                {st.done ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <span>{st.num}.</span>
                )}
                <span className="line-clamp-1">{st.name}</span>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{st.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('video')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'video'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Play className="w-4 h-4 text-purple-400" />
          ဗီဒီယို ကြည့်ရှုရန်
        </button>

        <button
          onClick={() => setActiveTab('script')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'script'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-400" />
          မြန်မာဇာတ်ညွှန်း တည်းဖြတ်ရန်
        </button>

        <button
          onClick={() => setActiveTab('chinese')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'chinese'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4 text-emerald-400" />
          တရုတ်စကားပြော & OCR မှတ်တမ်း
        </button>

        <button
          onClick={() => setActiveTab('subtitles')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'subtitles'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Subtitles className="w-4 h-4 text-yellow-400" />
          စာတန်းထိုး (.SRT)
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'export'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Download className="w-4 h-4 text-teal-400" />
          ဒေါင်းလုဒ် ရယူရန်
        </button>
      </div>

      {/* Tab Content 1: Video Player */}
      {activeTab === 'video' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVideoMode('final')}
                disabled={!project.finalVideoUrl}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  videoMode === 'final'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                ပြီးစီးသော Recap ဗီဒီယို
              </button>
              <button
                onClick={() => setVideoMode('original')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  videoMode === 'original'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                မူရင်း တရုတ်ဗီဒီယို
              </button>
            </div>

            {project.finalVideoUrl && (
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> မြန်မာအသံနှင့် စာတန်းထိုး ထည့်သွင်းထားသည်
              </span>
            )}
          </div>

          <div className="rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl relative aspect-video flex items-center justify-center">
            {videoMode === 'final' && project.finalVideoUrl ? (
              <video
                key={project.finalVideoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
                src={project.finalVideoUrl}
              />
            ) : project.originalVideoUrl ? (
              <video
                key={project.originalVideoUrl}
                controls
                className="w-full h-full object-contain"
                src={project.originalVideoUrl}
              />
            ) : (
              <div className="text-center p-8 text-slate-500">
                <Film className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm">ဗီဒီယို မရှိသေးပါ</p>
              </div>
            )}
          </div>

          {/* Quick Audio Narration Player if ready */}
          {project.narrationAudioUrl && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-purple-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    မြန်မာအသံထွက် သီးသန့် နားထောင်ရန်
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {project.voiceId === 'my-MM-NilarNeural' ? 'နီလာ (Nilar - Female)' : 'သီဟ (Thiha - Male)'}
                  </div>
                </div>
              </div>
              <audio controls src={project.narrationAudioUrl} className="h-8 max-w-xs" />
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Burmese Script Editor */}
      {activeTab === 'script' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">မြန်မာဇာတ်လမ်းပြော ဇာတ်ညွှန်း (Burmese Script)</h3>
              <p className="text-xs text-slate-400">လိုသလို ပြင်ဆင်ပြီး သိမ်းဆည်းနိုင်ပါသည်</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadScript}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 border border-slate-700 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                Script ဒေါင်းလုဒ်
              </button>
              <button
                onClick={handleSaveScript}
                disabled={isSavingScript}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingScript ? 'သိမ်းနေသည်...' : 'သိမ်းဆည်းမည်'}
              </button>
            </div>
          </div>

          {scriptSavedToast && (
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>ဇာတ်ညွှန်းကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ!</span>
            </div>
          )}

          {project.storySummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
              <div>
                <span className="font-semibold text-purple-300">ဇာတ်ကောင်များ: </span>
                <span className="text-slate-300">{project.storySummary.mainCharacters}</span>
              </div>
              <div>
                <span className="font-semibold text-purple-300">ဇာတ်လမ်းအဓိပ္ပာယ်: </span>
                <span className="text-slate-300">{project.storySummary.plotSummary}</span>
              </div>
            </div>
          )}

          <textarea
            rows={14}
            value={editedScript}
            onChange={(e) => setEditedScript(e.target.value)}
            placeholder="မြန်မာဇာတ်လမ်းပြော ဇာတ်ညွှန်း ရေးသားနေဆဲ ဖြစ်ပါသည်..."
            className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm leading-relaxed text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/70"
          />
        </div>
      )}

      {/* Tab Content 3: Chinese Speech & OCR */}
      {activeTab === 'chinese' && (
        <div className="space-y-6">
          {/* Groq Whisper Chinese Speech */}
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm text-white">
                  Groq Whisper Large V3 တရုတ်စကားပြော မှတ်တမ်း (Chinese Speech)
                </h3>
              </div>
              <span className="text-xs text-purple-400 font-mono">whisper-large-v3 • zh</span>
            </div>

            {project.chineseTranscript?.segments && project.chineseTranscript.segments.length > 0 ? (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-2">
                {project.chineseTranscript.segments.map((seg) => (
                  <div
                    key={seg.id}
                    className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start gap-3 text-xs"
                  >
                    <span className="font-mono text-purple-400 font-semibold shrink-0">
                      [{seg.start}s - {seg.end}s]
                    </span>
                    <span className="text-slate-200">{seg.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                {project.chineseTranscript?.fullText || 'တရုတ်စကားပြော မှတ်တမ်း မရှိသေးပါ'}
              </p>
            )}
          </div>

          {/* Gemini Vision Frame OCR */}
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-sm text-white">
                Gemini Vision ရုပ်ထွက် စာတန်းထိုးနှင့် မြင်ကွင်း ဖတ်ရှုချက်များ (Video OCR)
              </h3>
            </div>

            {project.ocrFrames && project.ocrFrames.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-2">
                {project.ocrFrames.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs space-y-1"
                  >
                    <span className="font-mono text-blue-400 font-semibold">
                      အချိန်: {f.timestamp}s
                    </span>
                    <p className="text-slate-300 whitespace-pre-wrap">{f.detectedText}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                ဖတ်ရှုထားသော စာတန်းထိုး မရှိသေးပါ
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 4: Subtitles */}
      {activeTab === 'subtitles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">မြန်မာစာတန်းထိုး (.SRT) စာရင်း</h3>
              <p className="text-xs text-slate-400">အချိန်ကိုက် ထွက်ပေါ်မည့် မြန်မာစာတန်းများ</p>
            </div>
            {project.srtUrl && (
              <a
                href={project.srtUrl}
                download={`${project.title}.srt`}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 border border-slate-700 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-yellow-400" />
                SRT ဒေါင်းလုဒ်
              </a>
            )}
          </div>

          {project.subtitles && project.subtitles.length > 0 ? (
            <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
              {project.subtitles.map((sub) => (
                <div
                  key={sub.id}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-4 text-xs"
                >
                  <span className="w-6 h-6 rounded-full bg-yellow-500/10 text-yellow-400 flex items-center justify-center font-bold shrink-0">
                    {sub.id}
                  </span>
                  <div className="space-y-1 flex-1">
                    <span className="font-mono text-purple-400 font-medium">
                      {sub.start}s ➔ {sub.end}s
                    </span>
                    <p className="text-slate-200 text-sm font-medium">{sub.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 rounded-xl bg-slate-900/30 border border-slate-800">
              စာတန်းထိုး မထုတ်လုပ်ရသေးပါ
            </div>
          )}
        </div>
      )}

      {/* Tab Content 5: Downloads & Export */}
      {activeTab === 'export' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-base text-white">ထုတ်လုပ်ထားသော ဖိုင်များ ဒေါင်းလုဒ်ရယူရန်</h3>
            <p className="text-xs text-slate-400">ဗီဒီယို၊ အသံဖိုင်၊ ဇာတ်ညွှန်းနှင့် စာတန်းထိုး ဖိုင်အားလုံးကို တိုက်ရိုက် ရယူနိုင်ပါသည်</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* MP4 Video */}
            <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">အပြီးသတ် Recap ဗီဒီယို (MP4)</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    မူရင်းရုပ်ထွက်၊ မြန်မာအသံနှင့် မြန်မာစာတန်းထိုး ပေါင်းစပ်ပြီးသော ဗီဒီယို
                  </p>
                </div>
              </div>

              {project.finalVideoUrl ? (
                <a
                  href={project.finalVideoUrl}
                  download={`${project.title}_Recap.mp4`}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" /> MP4 ဗီဒီယို ဒေါင်းလုဒ်
                </a>
              ) : (
                <button disabled className="w-full py-2 rounded-lg text-xs text-slate-500 bg-slate-800/50 cursor-not-allowed">
                  ဗီဒီယို မပြီးသေးပါ
                </button>
              )}
            </div>

            {/* Burmese Audio */}
            <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">မြန်မာအသံထွက် ဇာတ်လမ်းပြောဖိုင် (MP3)</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    AI Neural အသံဖြင့် သီးသန့်ထုတ်လုပ်ထားသော သဘာဝကျ မြန်မာအသံဖိုင်
                  </p>
                </div>
              </div>

              {project.narrationAudioUrl ? (
                <a
                  href={project.narrationAudioUrl}
                  download={`${project.title}_Narration.mp3`}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" /> MP3 အသံဖိုင် ဒေါင်းလုဒ်
                </a>
              ) : (
                <button disabled className="w-full py-2 rounded-lg text-xs text-slate-500 bg-slate-800/50 cursor-not-allowed">
                  အသံဖိုင် မပြီးသေးပါ
                </button>
              )}
            </div>

            {/* SRT Subtitles */}
            <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shrink-0">
                  <Subtitles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">မြန်မာစာတန်းထိုးဖိုင် (.SRT)</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    မည်သည့် ဗီဒီယို ပလေယာတွင်မဆို ထည့်သွင်း အသုံးပြုနိုင်သော စာတန်းထိုးဖိုင်
                  </p>
                </div>
              </div>

              {project.srtUrl ? (
                <a
                  href={project.srtUrl}
                  download={`${project.title}_Burmese.srt`}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-white bg-yellow-600 hover:bg-yellow-500 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" /> SRT စာတန်းထိုး ဒေါင်းလုဒ်
                </a>
              ) : (
                <button disabled className="w-full py-2 rounded-lg text-xs text-slate-500 bg-slate-800/50 cursor-not-allowed">
                  စာတန်းထိုး မပြီးသေးပါ
                </button>
              )}
            </div>

            {/* Script TXT */}
            <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">မြန်မာဇာတ်ညွှန်း စာသားဖိုင် (.TXT)</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    မြန်မာယူနီကုဒ်ဖြင့် ရေးသားထားသော အပြည့်အစုံ ဇာတ်လမ်းပြော စာသား
                  </p>
                </div>
              </div>

              {project.burmeseScript ? (
                <button
                  onClick={handleDownloadScript}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" /> TXT ဇာတ်ညွှန်း ဒေါင်းလုဒ်
                </button>
              ) : (
                <button disabled className="w-full py-2 rounded-lg text-xs text-slate-500 bg-slate-800/50 cursor-not-allowed">
                  ဇာတ်ညွှန်း မပြီးသေးပါ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
