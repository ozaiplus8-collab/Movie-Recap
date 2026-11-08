import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { VoiceId } from '../src/types/project.ts';
import { probeMedia } from './ffmpeg.ts';

const execFileAsync = promisify(execFile);

export const AVAILABLE_BURMESE_VOICES = [
  {
    id: 'my-MM-NilarNeural' as VoiceId,
    name: 'နီလာ (Nilar)',
    gender: 'Female',
    description: 'ကြည်လင်ပျော့ပျောင်းသော မြန်မာအမျိုးသမီးသံ (ဇာတ်လမ်းပြောအတွက် အထူးသင့်လျော်)',
  },
  {
    id: 'my-MM-ThihaNeural' as VoiceId,
    name: 'သီဟ (Thiha)',
    gender: 'Male',
    description: 'တည်ကြည်လေးနက်သော မြန်မာအမျိုးသားသံ (အက်ရှင်၊ သည်းထိတ်ရင်ဖိုအတွက် သင့်လျော်)',
  },
];

/**
 * Convert speed multiplier (0.8 - 1.2) to Edge TTS rate string (e.g. "-10%", "+10%")
 */
function getRateString(speed: number): string {
  const percent = Math.round((speed - 1.0) * 100);
  if (percent > 0) return `+${percent}%`;
  if (percent < 0) return `${percent}%`;
  return '+0%';
}

/**
 * Synthesize a single text piece to an MP3 file
 */
async function synthesizePiece(
  tts: MsEdgeTTS,
  text: string,
  outDir: string,
  speed: number
): Promise<string> {
  const rate = getRateString(speed);
  const res = await tts.toFile(outDir, text, { rate });
  return res.audioFilePath;
}

/**
 * Generate complete Burmese narration audio from script.
 * Handles splitting long scripts into manageable segments and concatenating them cleanly with FFmpeg.
 */
export async function generateBurmeseNarration(params: {
  scriptText: string;
  voiceId: VoiceId;
  voiceSpeed: number;
  outputFilePath: string;
}): Promise<{ audioPath: string; durationSeconds: number }> {
  const outDir = path.dirname(params.outputFilePath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const tempWorkDir = path.join(outDir, `tts_work_${Date.now()}`);
  fs.mkdirSync(tempWorkDir, { recursive: true });

  const tts = new MsEdgeTTS();
  await tts.setMetadata(params.voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  // Split script into manageable chunks (~150-250 characters each on sentence breaks)
  const sentences = params.scriptText
    .split(/([။\n]+)/)
    .reduce<string[]>((acc, part, i, arr) => {
      if (i % 2 === 0) {
        const punctuation = arr[i + 1] || '။';
        const sentence = (part + punctuation).trim();
        if (sentence) acc.push(sentence);
      }
      return acc;
    }, [])
    .filter((s) => s.length > 0);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > 220 && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += ' ' + sentence;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  if (chunks.length === 0) {
    chunks.push(params.scriptText.trim() || 'မင်္ဂလာပါ။ ဇာတ်လမ်းပြော တင်ဆက်မှု စတင်ပါပြီ။');
  }

  const generatedAudioFiles: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    const chunkDir = path.join(tempWorkDir, `chunk_${i}`);
    fs.mkdirSync(chunkDir, { recursive: true });

    try {
      const generatedPath = await synthesizePiece(tts, chunkText, chunkDir, params.voiceSpeed);
      if (fs.existsSync(generatedPath)) {
        generatedAudioFiles.push(generatedPath);
      }
    } catch (err) {
      console.error(`Error synthesizing chunk ${i}:`, err);
      // Wait briefly and retry once
      await new Promise((r) => setTimeout(r, 600));
      try {
        const generatedPath = await synthesizePiece(tts, chunkText, chunkDir, params.voiceSpeed);
        if (fs.existsSync(generatedPath)) {
          generatedAudioFiles.push(generatedPath);
        }
      } catch (retryErr) {
        console.error(`Retry failed for chunk ${i}:`, retryErr);
      }
    }
  }

  if (generatedAudioFiles.length === 0) {
    throw new Error('Burmese TTS အသံသွင်းခြင်း မအောင်မြင်ပါ။ အင်တာနက်ချိတ်ဆက်မှုကို စစ်ဆေးပါ။');
  }

  // Concatenate chunks using FFmpeg concat demuxer
  if (generatedAudioFiles.length === 1) {
    await fs.promises.copyFile(generatedAudioFiles[0], params.outputFilePath);
  } else {
    const listFilePath = path.join(tempWorkDir, 'concat_list.txt');
    const listContent = generatedAudioFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
    await fs.promises.writeFile(listFilePath, listContent, 'utf-8');

    await execFileAsync('ffmpeg', [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listFilePath,
      '-c', 'copy',
      params.outputFilePath,
    ]);
  }

  try {
    (tts as any).close?.();
  } catch {}

  // Clean up temp dir
  try {
    fs.rmSync(tempWorkDir, { recursive: true, force: true });
  } catch {}

  const probe = await probeMedia(params.outputFilePath);
  return {
    audioPath: params.outputFilePath,
    durationSeconds: probe.durationSeconds,
  };
}

/**
 * Preview voice with a short Burmese welcome phrase
 */
export async function previewBurmeseVoice(
  voiceId: VoiceId,
  outputDir: string
): Promise<string> {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const previewText = voiceId === 'my-MM-NilarNeural'
    ? 'မင်္ဂလာပါရှင်။ ကျွန်မကတော့ နီလာ ဖြစ်ပါတယ်။ တရုတ်ရုပ်ရှင်ဇာတ်လမ်းများကို စိတ်ဝင်စားဖွယ် တင်ဆက်ပေးသွားမှာ ဖြစ်ပါတယ်။'
    : 'မင်္ဂလာပါ။ ကျွန်တော်ကတော့ သီဟ ဖြစ်ပါတယ်။ တရုတ်ရုပ်ရှင်ဇာတ်လမ်းများကို စိတ်လှုပ်ရှားဖွယ် ဇာတ်လမ်းပြော တင်ဆက်ပေးပါ့မယ်။';

  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const res = await tts.toFile(outputDir, previewText, { rate: '+0%' });
    return res.audioFilePath;
  } finally {
    try {
      (tts as any).close?.();
    } catch {}
  }
}
