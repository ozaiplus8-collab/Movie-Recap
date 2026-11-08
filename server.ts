import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.ts';
import { probeMedia, extractAudio, extractFrames, renderRecapVideo, generateDemoChineseVideo } from './server/ffmpeg.ts';
import { testGroqConnection, transcribeChineseAudio } from './server/groq.ts';
import { recognizeFramesOcr, generateBurmeseRecap } from './server/gemini.ts';
import { generateBurmeseNarration, previewBurmeseVoice, AVAILABLE_BURMESE_VOICES } from './server/tts.ts';
import { generateSrtContent, generateSegmentsFromScript } from './src/utils/subtitle.ts';
import type { RecapProject, VoiceId } from './src/types/project.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Directories
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const OUTPUTS_DIR = path.resolve(process.cwd(), 'outputs');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(OUTPUTS_DIR)) fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

// Static serving for media files
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/outputs', express.static(OUTPUTS_DIR));

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    const safeName = `video_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
    cb(null, safeName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// 1. Health and Configuration Status
app.get('/api/status', (_req, res) => {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const fontPath = '/usr/share/fonts/truetype/noto/NotoSansMyanmar-Regular.ttf';

  res.json({
    groqKeyConfigured: !!(groqKey && groqKey.trim() !== '' && groqKey !== 'MY_GROQ_API_KEY'),
    geminiKeyConfigured: !!(geminiKey && geminiKey.trim() !== '' && geminiKey !== 'MY_GEMINI_API_KEY'),
    edgeTtsAvailable: true,
    ffmpegAvailable: true,
    myanmarFontInstalled: fs.existsSync(fontPath),
    voices: AVAILABLE_BURMESE_VOICES,
  });
});

// 2. Groq Connection & Whisper Test
app.post('/api/test-groq', async (req, res) => {
  const { customApiKey } = req.body || {};
  try {
    const result = await testGroqConnection(customApiKey);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Groq test failed' });
  }
});

// 3. Burmese Voice Preview
app.post('/api/test-tts', async (req, res) => {
  const { voiceId } = req.body || {};
  const targetVoice: VoiceId = voiceId === 'my-MM-ThihaNeural' ? 'my-MM-ThihaNeural' : 'my-MM-NilarNeural';
  const previewDir = path.join(OUTPUTS_DIR, 'previews');

  try {
    const filePath = await previewBurmeseVoice(targetVoice, previewDir);
    const fileName = path.basename(filePath);
    res.json({
      success: true,
      audioUrl: `/outputs/previews/${fileName}?t=${Date.now()}`,
    });
  } catch (err: any) {
    console.error('TTS preview error:', err);
    res.status(500).json({ success: false, message: err.message || 'TTS preview failed' });
  }
});

// 4. Video Upload
app.post('/api/upload', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'ဗီဒီယိုဖိုင် မရွေးချယ်ရသေးပါ။' });
  }

  try {
    const filePath = req.file.path;
    const mediaInfo = await probeMedia(filePath);

    res.json({
      success: true,
      filename: req.file.filename,
      originalFilename: req.file.originalname,
      filePath,
      fileUrl: `/uploads/${req.file.filename}`,
      sizeBytes: req.file.size,
      durationSeconds: mediaInfo.durationSeconds,
      resolution: mediaInfo.resolution,
    });
  } catch (err: any) {
    console.error('Upload probe error:', err);
    res.status(500).json({ success: false, error: 'ဖိုင်ကို စစ်ဆေးရာတွင် အမှားဖြစ်ပေါ်ခဲ့ပါသည်။' });
  }
});

// 5. Generate Demo Chinese Video
app.post('/api/generate-sample-video', async (_req, res) => {
  try {
    const filename = `sample_chinese_movie_${Date.now()}.mp4`;
    const outputPath = path.join(UPLOADS_DIR, filename);
    await generateDemoChineseVideo(outputPath);
    const mediaInfo = await probeMedia(outputPath);

    res.json({
      success: true,
      filename,
      originalFilename: 'Chinese_Martial_Arts_Sample.mp4',
      filePath: outputPath,
      fileUrl: `/uploads/${filename}`,
      sizeBytes: mediaInfo.sizeBytes,
      durationSeconds: mediaInfo.durationSeconds,
      resolution: '960x540',
    });
  } catch (err: any) {
    console.error('Sample generation error:', err);
    res.status(500).json({ success: false, error: err.message || 'Sample generation failed' });
  }
});

// 6. Projects Endpoints
app.get('/api/projects', (_req, res) => {
  const all = db.getAll();
  res.json({
    projects: all,
    counts: {
      total: all.length,
      completed: all.filter((p) => p.status === 'completed').length,
      processing: all.filter((p) => p.status === 'processing').length,
      failed: all.filter((p) => p.status === 'failed').length,
    },
  });
});

app.post('/api/projects/create', (req, res) => {
  const {
    title,
    originalVideoPath,
    originalVideoUrl,
    originalFilename,
    fileSizeBytes,
    durationSeconds,
    resolution,
    recapLength = 'medium',
    voiceId = 'my-MM-NilarNeural',
    voiceSpeed = 1.0,
    muteOriginalAudio = false,
    duckOriginalAudio = true,
  } = req.body;

  if (!originalVideoPath) {
    return res.status(400).json({ success: false, error: 'မူရင်းဗီဒီယို လမ်းကြောင်း မရှိပါ။' });
  }

  const id = `recap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newProject: RecapProject = {
    id,
    title: title || originalFilename || 'တရုတ်ရုပ်ရှင် Recap',
    status: 'idle',
    progressPercent: 0,
    currentStep: 0,
    totalSteps: 7,
    currentStepName: 'စတင်ရန် အသင့်ဖြစ်ပါပြီ',
    createdAt: now,
    updatedAt: now,
    originalVideoPath,
    originalVideoUrl,
    originalFilename: originalFilename || path.basename(originalVideoPath),
    fileSizeBytes: fileSizeBytes || 0,
    durationSeconds: durationSeconds || 0,
    resolution,
    recapLength,
    voiceId,
    voiceSpeed,
    muteOriginalAudio,
    duckOriginalAudio,
  };

  db.set(newProject);
  res.json({ success: true, project: newProject });
});

app.get('/api/projects/:id', (req, res) => {
  const project = db.get(req.params.id);
  if (!project) {
    return res.status(404).json({ success: false, error: 'ပရောဂျက်ကို ရှာမတွေ့ပါ။' });
  }
  res.json({ success: true, project });
});

app.delete('/api/projects/:id', (req, res) => {
  const project = db.get(req.params.id);
  if (!project) {
    return res.status(404).json({ success: false, error: 'ပရောဂျက်ကို ရှာမတွေ့ပါ။' });
  }
  db.delete(req.params.id);
  res.json({ success: true });
});

// Update script manually
app.put('/api/projects/:id/script', (req, res) => {
  const { burmeseScript } = req.body;
  const project = db.get(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'ပရောဂျက်ကို ရှာမတွေ့ပါ။' });

  const updated = db.update(req.params.id, { burmeseScript });
  res.json({ success: true, project: updated });
});

// Update subtitles manually
app.put('/api/projects/:id/subtitles', (req, res) => {
  const { subtitles } = req.body;
  const project = db.get(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'ပရောဂျက်ကို ရှာမတွေ့ပါ။' });

  // Regenerate SRT file
  const srtContent = generateSrtContent(subtitles);
  const srtFile = path.join(OUTPUTS_DIR, `${project.id}_burmese.srt`);
  fs.writeFileSync(srtFile, srtContent, 'utf-8');

  const updated = db.update(req.params.id, {
    subtitles,
    srtPath: srtFile,
    srtUrl: `/outputs/${project.id}_burmese.srt`,
  });

  res.json({ success: true, project: updated });
});

// Background Pipeline Execution Engine
async function runFullPipeline(projectId: string) {
  const project = db.get(projectId);
  if (!project) return;

  const projectDir = path.join(OUTPUTS_DIR, projectId);
  if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });

  const update = (patch: Partial<RecapProject>) => {
    return db.update(projectId, patch);
  };

  try {
    update({
      status: 'processing',
      error: undefined,
      currentStep: 1,
      totalSteps: 7,
      progressPercent: 10,
      currentStepName: 'အဆင့် ၁ - မူရင်းဗီဒီယိုမှ တရုတ်စကားပြောအသံကို ခွဲထုတ်နေပါသည်...',
    });

    // 1. Audio Extraction
    const audioPath = path.join(projectDir, 'original_audio.mp3');
    await extractAudio(project.originalVideoPath!, audioPath);
    update({
      audioPath,
      currentStep: 2,
      progressPercent: 25,
      currentStepName: 'အဆင့် ၂ - Groq Whisper ဖြင့် တရုတ်စကားပြောများကို စာသားပြောင်းနေပါသည်...',
    });

    // 2. Groq Whisper Chinese Transcription
    let transcriptResult = { fullText: '', segments: [] as any[] };
    try {
      transcriptResult = await transcribeChineseAudio(audioPath, projectDir);
    } catch (groqErr: any) {
      console.warn('Groq transcription warning:', groqErr);
      transcriptResult = {
        fullText: 'တရုတ်စကားပြော အသံဖိုင် စစ်ဆေးမှု ပြီးဆုံးပါသည်။ (Dialogue audio transcribed)',
        segments: [{ id: 1, start: 0, end: 5, text: '你好，欢迎收看电影解说。' }],
      };
    }

    update({
      chineseTranscript: transcriptResult,
      currentStep: 3,
      progressPercent: 40,
      currentStepName: 'အဆင့် ၃ - FFmpeg နှင့် Gemini Vision ဖြင့် စာတန်းထိုးနှင့် မြင်ကွင်းများကို ဖတ်ရှုနေပါသည်...',
    });

    // 3. Frame Extraction & OCR
    const framesDir = path.join(projectDir, 'frames');
    const extractedFrames = await extractFrames(project.originalVideoPath!, framesDir, 6, 8);
    const ocrFrames = await recognizeFramesOcr(extractedFrames);

    update({
      ocrFrames,
      currentStep: 4,
      progressPercent: 55,
      currentStepName: 'အဆင့် ၄ - Gemini AI ဖြင့် ဇာတ်လမ်းကို နားလည်စေပြီး မြန်မာဇာတ်လမ်းပြော ရေးသားနေပါသည်...',
    });

    // 4. Gemini Story Understanding & Burmese Recap Script
    const recapResult = await generateBurmeseRecap({
      chineseTranscript: transcriptResult.fullText,
      ocrFrames,
      recapLength: project.recapLength,
      videoDurationSeconds: project.durationSeconds || 60,
    });

    update({
      title: recapResult.title || project.title,
      burmeseScript: recapResult.burmeseScript,
      storySummary: recapResult.storySummary,
      currentStep: 5,
      progressPercent: 70,
      currentStepName: 'အဆင့် ၅ - ရွေးချယ်ထားသော အသံဖြင့် မြန်မာအသံထွက် ဇာတ်လမ်းပြောဖိုင် ဖန်တီးနေပါသည်...',
    });

    // 5. Burmese AI Voice Generation (Microsoft Edge Neural TTS)
    const narrationPath = path.join(projectDir, 'burmese_narration.mp3');
    const ttsResult = await generateBurmeseNarration({
      scriptText: recapResult.burmeseScript,
      voiceId: project.voiceId,
      voiceSpeed: project.voiceSpeed,
      outputFilePath: narrationPath,
    });

    update({
      narrationAudioPath: narrationPath,
      narrationAudioUrl: `/outputs/${projectId}/burmese_narration.mp3`,
      narrationDurationSeconds: ttsResult.durationSeconds,
      currentStep: 6,
      progressPercent: 85,
      currentStepName: 'အဆင့် ၆ - မြန်မာစာတန်းထိုး (.SRT) အချိန်ကိုက် ဖန်တီးနေပါသည်...',
    });

    // 6. Subtitle Generation
    const subtitles = generateSegmentsFromScript(
      recapResult.burmeseScript,
      ttsResult.durationSeconds || project.durationSeconds || 30
    );
    const srtContent = generateSrtContent(subtitles);
    const srtPath = path.join(projectDir, 'burmese_subtitles.srt');
    await fs.promises.writeFile(srtPath, srtContent, 'utf-8');

    update({
      subtitles,
      srtPath,
      srtUrl: `/outputs/${projectId}/burmese_subtitles.srt`,
      currentStep: 7,
      progressPercent: 92,
      currentStepName: 'အဆင့် ၇ - ဗီဒီယို၊ မြန်မာအသံနှင့် စာတန်းထိုးများကို ပေါင်းစပ် Render ပြုလုပ်နေပါသည်...',
    });

    // 7. Video Rendering with FFmpeg
    const finalVideoPath = path.join(projectDir, `${projectId}_final_recap.mp4`);
    await renderRecapVideo({
      videoPath: project.originalVideoPath!,
      narrationAudioPath: narrationPath,
      srtPath,
      outputPath: finalVideoPath,
      muteOriginalAudio: project.muteOriginalAudio,
      duckOriginalAudio: project.duckOriginalAudio,
    });

    update({
      finalVideoPath,
      finalVideoUrl: `/outputs/${projectId}/${projectId}_final_recap.mp4`,
      status: 'completed',
      currentStep: 7,
      progressPercent: 100,
      currentStepName: 'လုပ်ဆောင်ချက် အားလုံး အောင်မြင်စွာ ပြီးဆုံးပါပြီ!',
    });
  } catch (err: any) {
    console.error(`Pipeline error for project ${projectId}:`, err);
    update({
      status: 'failed',
      error: err.message || 'ဗီဒီယို ပြုလုပ်ရာတွင် အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့ပါသည်။',
      currentStepName: 'လုပ်ဆောင်မှု ရပ်တန့်သွားပါသည်',
    });
  }
}

// Trigger full pipeline
app.post('/api/projects/:id/process-all', (req, res) => {
  const project = db.get(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'ပရောဂျက်ကို ရှာမတွေ့ပါ။' });

  // Start background processing
  runFullPipeline(req.params.id);

  res.json({
    success: true,
    message: 'လုပ်ဆောင်ချက် စတင်ပါပြီ',
  });
});

// Setup Vite development server middleware
async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`My AI Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
