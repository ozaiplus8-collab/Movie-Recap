export type ProjectStatus = 'idle' | 'processing' | 'completed' | 'failed';

export type RecapLength = 'short' | 'medium' | 'long';

export type VoiceId = 'my-MM-NilarNeural' | 'my-MM-ThihaNeural';

export interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface OcrFrame {
  timestamp: number;
  framePath: string;
  detectedText: string;
}

export interface SubtitleItem {
  id: number;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

export interface RecapProject {
  id: string;
  title: string;
  status: ProjectStatus;
  progressPercent: number;
  currentStep: number;
  totalSteps: number;
  currentStepName: string;
  error?: string;
  createdAt: string;
  updatedAt: string;

  // Video info
  originalVideoPath?: string;
  originalVideoUrl?: string;
  originalFilename: string;
  fileSizeBytes: number;
  durationSeconds: number;
  resolution?: string;

  // Options
  recapLength: RecapLength;
  voiceId: VoiceId;
  voiceSpeed: number; // 0.8 to 1.2
  muteOriginalAudio: boolean;
  duckOriginalAudio: boolean;

  // Pipeline artifacts
  audioPath?: string;
  chineseTranscript?: {
    fullText: string;
    segments: WhisperSegment[];
  };
  ocrFrames?: OcrFrame[];
  storySummary?: {
    mainCharacters: string;
    plotSummary: string;
    theme: string;
  };
  burmeseScript?: string;
  narrationAudioPath?: string;
  narrationAudioUrl?: string;
  narrationDurationSeconds?: number;
  subtitles?: SubtitleItem[];
  srtPath?: string;
  srtUrl?: string;
  finalVideoPath?: string;
  finalVideoUrl?: string;
}

export interface SystemHealth {
  groqKeyConfigured: boolean;
  geminiKeyConfigured: boolean;
  edgeTtsAvailable: boolean;
  ffmpegAvailable: boolean;
  myanmarFontInstalled: boolean;
}
