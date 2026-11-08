import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileVideo,
  X,
  Play,
  Volume2,
  Sparkles,
  Check,
  AlertCircle,
  Clock,
  Film,
  Sliders,
  Flame
} from 'lucide-react';
import { RecapLength, VoiceId } from '../types/project.ts';

interface CreateRecapViewProps {
  onProjectCreated: (projectId: string) => void;
  onPreviewVoice: (voiceId: VoiceId) => Promise<string | null>;
}

export const CreateRecapView: React.FC<CreateRecapViewProps> = ({
  onProjectCreated,
  onPreviewVoice,
}) => {
  // Video upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedVideoInfo, setUploadedVideoInfo] = useState<{
    filePath: string;
    fileUrl: string;
    filename: string;
    originalFilename: string;
    sizeBytes: number;
    durationSeconds: number;
    resolution?: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);

  // Configuration options
  const [title, setTitle] = useState('');
  const [recapLength, setRecapLength] = useState<RecapLength>('medium');
  const [voiceId, setVoiceId] = useState<VoiceId>('my-MM-NilarNeural');
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);
  const [duckOriginalAudio, setDuckOriginalAudio] = useState(true);
  const [muteOriginalAudio, setMuteOriginalAudio] = useState(false);

  // Voice preview state
  const [previewingVoice, setPreviewingVoice] = useState<VoiceId | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = async (file: File) => {
    // Validate file type
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm', 'video/avi'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|mov|mkv|webm|avi)$/i)) {
      setUploadError('ထောက်ပံ့မထားသော ဗီဒီယိုဖိုင် အမျိုးအစားဖြစ်ပါသည်။ (MP4, MOV, MKV, WebM များသာ)');
      return;
    }

    // Max 500MB
    if (file.size > 500 * 1024 * 1024) {
      setUploadError('ဗီဒီယိုဖိုင် အရွယ်အစား 500MB ထက် မကျော်ရပါ။');
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(cleanName);
    }

    // Start real upload via FormData
    setIsUploading(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append('video', file);

      setUploadProgress(45);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(85);
      const data = await res.json();

      if (data.success) {
        setUploadedVideoInfo({
          filePath: data.filePath,
          fileUrl: data.fileUrl,
          filename: data.filename,
          originalFilename: data.originalFilename,
          sizeBytes: data.sizeBytes,
          durationSeconds: data.durationSeconds,
          resolution: data.resolution,
        });
        setUploadProgress(100);
      } else {
        setUploadError(data.error || 'ဗီဒီယို တင်သွင်းခြင်း မအောင်မြင်ပါ။');
        setSelectedFile(null);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadError('ဗီဒီယို တင်သွင်းရာတွင် ကွန်ရက်အမှား ဖြစ်ပေါ်ခဲ့ပါသည်။');
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Generate synthetic sample video
  const handleUseSampleVideo = async () => {
    setIsGeneratingSample(true);
    setUploadError(null);
    try {
      const res = await fetch('/api/generate-sample-video', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setUploadedVideoInfo({
          filePath: data.filePath,
          fileUrl: data.fileUrl,
          filename: data.filename,
          originalFilename: data.originalFilename,
          sizeBytes: data.sizeBytes,
          durationSeconds: data.durationSeconds,
          resolution: data.resolution,
        });
        setTitle('တရုတ်သိုင်းရုပ်ရှင် နမူနာ ဇာတ်ကား');
      } else {
        setUploadError('နမူနာဗီဒီယို ပြုလုပ်ခြင်း မအောင်မြင်ပါ');
      }
    } catch (err) {
      setUploadError('နမူနာဗီဒီယို ဖန်တီးရာတွင် အမှားဖြစ်ပေါ်ခဲ့ပါသည်');
    } finally {
      setIsGeneratingSample(false);
    }
  };

  const handleRemoveVideo = () => {
    setSelectedFile(null);
    setUploadedVideoInfo(null);
    setUploadProgress(0);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleVoicePreview = async (vId: VoiceId) => {
    setPreviewingVoice(vId);
    try {
      const url = await onPreviewVoice(vId);
      if (url) {
        setAudioPreviewUrl(url);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
        }
      }
    } catch (err) {
      console.error('Voice preview error:', err);
    } finally {
      setPreviewingVoice(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedVideoInfo) {
      setUploadError('ကျေးဇူးပြု၍ တရုတ်ဗီဒီယိုဖိုင် တစ်ခု တင်သွင်းပေးပါ သို့မဟုတ် နမူနာဗီဒီယိုကို အသုံးပြုပါ။');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || uploadedVideoInfo.originalFilename,
          originalVideoPath: uploadedVideoInfo.filePath,
          originalVideoUrl: uploadedVideoInfo.fileUrl,
          originalFilename: uploadedVideoInfo.originalFilename,
          fileSizeBytes: uploadedVideoInfo.sizeBytes,
          durationSeconds: uploadedVideoInfo.durationSeconds,
          resolution: uploadedVideoInfo.resolution,
          recapLength,
          voiceId,
          voiceSpeed,
          muteOriginalAudio,
          duckOriginalAudio: !muteOriginalAudio && duckOriginalAudio,
        }),
      });

      const data = await res.json();
      if (data.success && data.project) {
        // Start processing automatically
        await fetch(`/api/projects/${data.project.id}/process-all`, {
          method: 'POST',
        });
        onProjectCreated(data.project.id);
      } else {
        setUploadError(data.error || 'ပရောဂျက် ဖန်တီးခြင်း မအောင်မြင်ပါ');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.error('Create error:', err);
      setUploadError('ပရောဂျက် စတင်ရာတွင် အမှားဖြစ်ပေါ်ခဲ့ပါသည်');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
          Recap အသစ် ဖန်တီးရန်
        </h1>
        <p className="text-sm text-slate-400">
          တရုတ်ဗီဒီယိုကို ရွေးချယ်ပြီး လိုအပ်သော အသံနှင့် ဇာတ်လမ်းပြော ရွေးချယ်မှုများကို သတ်မှတ်ပါ
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Video Upload Area */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-400 text-xs flex items-center justify-center font-bold border border-purple-500/40">
                ၁
              </span>
              တရုတ်ဗီဒီယိုဖိုင် တင်သွင်းခြင်း (Video Upload)
            </h2>

            {/* Quick Demo Button */}
            {!uploadedVideoInfo && (
              <button
                type="button"
                onClick={handleUseSampleVideo}
                disabled={isGeneratingSample || isUploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-300 bg-purple-950/70 hover:bg-purple-900/80 border border-purple-700/60 transition-all"
              >
                <Flame className="w-3.5 h-3.5 text-purple-400" />
                {isGeneratingSample ? 'နမူနာ ဖန်တီးနေသည်...' : 'နမူနာ ဗီဒီယိုဖြင့် စမ်းသပ်မည်'}
              </button>
            )}
          </div>

          {!uploadedVideoInfo ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-slate-700/80 hover:border-purple-500/50 bg-slate-950/40 hover:bg-slate-950/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/x-matroska,video/webm,video/avi"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelected(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <div className="w-14 h-14 rounded-2xl bg-purple-600/15 text-purple-400 mx-auto flex items-center justify-center mb-4 border border-purple-500/20">
                <UploadCloud className="w-7 h-7" />
              </div>

              <p className="text-sm font-semibold text-slate-200 mb-1">
                ဤနေရာတွင် တရုတ်ဗီဒီယိုဖိုင် ဆွဲထည့်ပါ သို့မဟုတ် ကလစ်နှိပ်ပြီး ရွေးချယ်ပါ
              </p>
              <p className="text-xs text-slate-400 mb-4">
                MP4, MOV, MKV, WebM (အများဆုံး 500MB)
              </p>

              {isUploading && (
                <div className="max-w-xs mx-auto space-y-2 mt-4">
                  <div className="flex justify-between text-xs text-purple-400">
                    <span>ဗီဒီယို တင်သွင်းနေသည်...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Uploaded Video Card */
            <div className="rounded-xl bg-slate-950/80 border border-slate-700/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <FileVideo className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-200 line-clamp-1">
                    {uploadedVideoInfo.originalFilename}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>{(uploadedVideoInfo.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-purple-400" />
                      {uploadedVideoInfo.durationSeconds ? `${Math.round(uploadedVideoInfo.durationSeconds)} စက္ကန့်` : 'မသိရ'}
                    </span>
                    {uploadedVideoInfo.resolution && (
                      <>
                        <span>•</span>
                        <span>{uploadedVideoInfo.resolution}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={uploadedVideoInfo.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 text-purple-400" />
                  ကြည့်ရှုမည်
                </a>
                <button
                  type="button"
                  onClick={handleRemoveVideo}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 transition-colors flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  ဖယ်ရှားမည်
                </button>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* Step 2: Project Title & Settings */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-400 text-xs flex items-center justify-center font-bold border border-purple-500/40">
              ၂
            </span>
            Recap ဇာတ်လမ်းပြော စိတ်ကြိုက်ပြင်ဆင်ချက်များ
          </h2>

          {/* Title Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              ပရောဂျက် ခေါင်းစဉ် (Title)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ဥပမာ - ရှေးခေတ်နန်းတွင်း အမွေဆက်ခံသူ လျှို့ဝှက်ချက်"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/70 transition-colors"
            />
          </div>

          {/* Recap Length Options */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Recap ဇာတ်လမ်းပြော အရှည် ရွေးချယ်ရန် (Recap Length)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setRecapLength('short')}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  recapLength === 'short'
                    ? 'border-purple-500 bg-purple-950/40 text-purple-200'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                }`}
              >
                {recapLength === 'short' && (
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                <div className="font-semibold text-sm text-white mb-1">အကျဉ်းချုပ် (Short)</div>
                <div className="text-xs text-slate-400">~ ၁ မှ ၂ မိနစ်စာ</div>
                <div className="text-[11px] text-slate-500 mt-1">အဓိက အနှစ်ချုပ် လိုရင်းတိုရှင်း</div>
              </button>

              <button
                type="button"
                onClick={() => setRecapLength('medium')}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  recapLength === 'medium'
                    ? 'border-purple-500 bg-purple-950/40 text-purple-200'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                }`}
              >
                {recapLength === 'medium' && (
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                <div className="flex items-center gap-1.5 font-semibold text-sm text-white mb-1">
                  အလယ်အလတ် (Medium)
                  <span className="text-[10px] bg-purple-600/30 text-purple-300 px-1.5 py-0.2 rounded border border-purple-500/40">
                    အကြံပြု
                  </span>
                </div>
                <div className="text-xs text-slate-400">~ ၃ မှ ၅ မိနစ်စာ</div>
                <div className="text-[11px] text-slate-500 mt-1">အစ၊ အလယ်၊ အဆုံး ပြည့်စုံ</div>
              </button>

              <button
                type="button"
                onClick={() => setRecapLength('long')}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  recapLength === 'long'
                    ? 'border-purple-500 bg-purple-950/40 text-purple-200'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700'
                }`}
              >
                {recapLength === 'long' && (
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                <div className="font-semibold text-sm text-white mb-1">အသေးစိတ် (Long)</div>
                <div className="text-xs text-slate-400">~ ၇ မှ ၁၀ မိနစ်စာ</div>
                <div className="text-[11px] text-slate-500 mt-1">ဇာတ်ကောင်၊ အလှည့်အပြောင်း အပြည့်အစုံ</div>
              </button>
            </div>
          </div>

          {/* Step 3: Burmese Voice Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                မြန်မာ အသံထွက် ရွေးချယ်ရန် (Burmese Neural Voice)
              </label>
              <span className="text-xs text-purple-400 font-medium">သဘာဝကျသော AI Neural အသံ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* Nilar (Female) */}
              <div
                onClick={() => setVoiceId('my-MM-NilarNeural')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  voiceId === 'my-MM-NilarNeural'
                    ? 'border-purple-500 bg-purple-950/40 shadow-sm shadow-purple-500/20'
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs font-bold">
                      နီ
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-white">နီလာ (Nilar)</h4>
                      <p className="text-[11px] text-pink-400">အမျိုးသမီးသံ (Female)</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVoicePreview('my-MM-NilarNeural');
                    }}
                    disabled={previewingVoice === 'my-MM-NilarNeural'}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-purple-900/60 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                    title="အသံနမူနာ နားထောင်မည်"
                  >
                    <Volume2
                      className={`w-4 h-4 text-purple-400 ${
                        previewingVoice === 'my-MM-NilarNeural' ? 'animate-pulse' : ''
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  ကြည်လင်ပျော့ပျောင်းပြီး နားထောင်ရ လွယ်ကူသော အသံ (ဇာတ်လမ်းပြောအတွက် အထူးသင့်လျော်)
                </p>
              </div>

              {/* Thiha (Male) */}
              <div
                onClick={() => setVoiceId('my-MM-ThihaNeural')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  voiceId === 'my-MM-ThihaNeural'
                    ? 'border-purple-500 bg-purple-950/40 shadow-sm shadow-purple-500/20'
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                      သီ
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-white">သီဟ (Thiha)</h4>
                      <p className="text-[11px] text-blue-400">အမျိုးသားသံ (Male)</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVoicePreview('my-MM-ThihaNeural');
                    }}
                    disabled={previewingVoice === 'my-MM-ThihaNeural'}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-purple-900/60 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                    title="အသံနမူနာ နားထောင်မည်"
                  >
                    <Volume2
                      className={`w-4 h-4 text-blue-400 ${
                        previewingVoice === 'my-MM-ThihaNeural' ? 'animate-pulse' : ''
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  တည်ကြည်လေးနက်သော အသံ (အက်ရှင်၊ စုံထောက်နှင့် သည်းထိတ်ရင်ဖိုအတွက် သင့်လျော်)
                </p>
              </div>
            </div>

            {/* Speaking Speed Slider */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Sliders className="w-4 h-4 text-purple-400" />
                အသံပြောနှုန်း (Speaking Speed):
                <span className="text-purple-400 font-bold ml-1">{voiceSpeed}x</span>
              </div>
              <div className="flex items-center gap-2">
                {[0.9, 1.0, 1.1].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setVoiceSpeed(speed)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      voiceSpeed === speed
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {speed === 1.0 ? 'ပုံမှန် (1.0x)' : `${speed}x`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Audio Mixing Options */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              မူရင်း တရုတ်အသံ စီမံမှု (Audio Mixing)
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={duckOriginalAudio && !muteOriginalAudio}
                  onChange={(e) => {
                    setDuckOriginalAudio(e.target.checked);
                    if (e.target.checked) setMuteOriginalAudio(false);
                  }}
                  className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    မူရင်းတရုတ်အသံကို အနည်းငယ်ဖွင့်ထားမည် (15% Background Ducking - အကြံပြုပါသည်)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    မူရင်းနောက်ခံအသံနှင့် သီချင်းသံများ အနည်းငယ်ပါဝင်ပြီး မြန်မာအသံကို ရှင်းလင်းစွာ အပေါ်မှကြားရမည်
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={muteOriginalAudio}
                  onChange={(e) => {
                    setMuteOriginalAudio(e.target.checked);
                    if (e.target.checked) setDuckOriginalAudio(false);
                  }}
                  className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-200">
                    မူရင်းတရုတ်အသံကို လုံးဝပိတ်မည် (Mute Original Audio)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    မူရင်းအသံကို လုံးဝပိတ်ပြီး AI မြန်မာအသံထွက် ဇာတ်လမ်းပြောသက်သက်သာ ထည့်သွင်းမည်
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Hidden Audio element for voice previews */}
        <audio ref={audioRef} className="hidden" />

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={!uploadedVideoInfo || isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-purple-600/25 transition-all transform active:scale-[0.99]"
          >
            <Sparkles className="w-5 h-5 text-purple-200" />
            {isSubmitting
              ? 'Recap စတင် ပြုလုပ်နေပါသည်...'
              : 'Recap ဗီဒီယို စတင်ဖန်တီးမည် (Start Recap Generation)'}
          </button>
        </div>
      </form>
    </div>
  );
};
