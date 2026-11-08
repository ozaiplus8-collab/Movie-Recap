import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { WhisperSegment } from '../src/types/project.ts';
import { stitchWhisperChunks } from '../src/utils/subtitle.ts';
import { probeMedia } from './ffmpeg.ts';

const execFileAsync = promisify(execFile);

export function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GROQ_API_KEY') {
    return null;
  }
  return new Groq({ apiKey });
}

export interface TranscriptionResult {
  fullText: string;
  segments: WhisperSegment[];
  duration: number;
}

/**
 * Transcribe a single audio file with Groq Whisper Large V3
 */
async function transcribeSingleFile(
  groq: Groq,
  audioPath: string
): Promise<TranscriptionResult> {
  const fileStream = fs.createReadStream(audioPath);

  const response: any = await groq.audio.transcriptions.create({
    file: fileStream,
    model: 'whisper-large-v3',
    language: 'zh',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  const fullText = response.text || '';
  const rawSegments = response.segments || [];

  const segments: WhisperSegment[] = rawSegments.map((s: any, idx: number) => ({
    id: idx + 1,
    start: Number((s.start || 0).toFixed(2)),
    end: Number((s.end || 0).toFixed(2)),
    text: s.text ? s.text.trim() : '',
  }));

  const duration = Number((response.duration || 0).toFixed(2));

  return { fullText, segments, duration };
}

/**
 * Transcribe audio using Groq Whisper Large V3.
 * If audio is longer than 10 minutes or larger than 24MB, split into chunks, transcribe each,
 * and stitch with accurate timestamps.
 */
export async function transcribeChineseAudio(
  audioPath: string,
  tempDir: string
): Promise<TranscriptionResult> {
  const groq = getGroqClient();
  if (!groq) {
    throw new Error(
      'GROQ_API_KEY မရှိသေးပါ။ AI Studio ၏ Settings > Secrets သို့မဟုတ် Environment တွင် GROQ_API_KEY ထည့်သွင်းပေးရန် လိုအပ်ပါသည်။'
    );
  }

  const stat = await fs.promises.stat(audioPath);
  const mediaInfo = await probeMedia(audioPath);
  const duration = mediaInfo.durationSeconds;
  const fileSizeMb = stat.size / (1024 * 1024);

  // If smaller than 24MB and less than 600 seconds (10 mins), transcribe in single request
  if (fileSizeMb < 24 && duration < 600) {
    const res = await transcribeSingleFile(groq, audioPath);
    return res;
  }

  // Chunking for long videos
  const chunkLengthSec = 300; // 5 minute chunks
  const chunkDir = path.join(tempDir, 'chunks');
  if (!fs.existsSync(chunkDir)) fs.mkdirSync(chunkDir, { recursive: true });

  const chunkPromises: Array<{ offsetSeconds: number; segments: WhisperSegment[] }> = [];
  const fullTexts: string[] = [];

  for (let offset = 0; offset < duration; offset += chunkLengthSec) {
    const chunkPath = path.join(chunkDir, `chunk_${offset}.mp3`);
    await execFileAsync('ffmpeg', [
      '-y',
      '-ss', String(offset),
      '-t', String(chunkLengthSec),
      '-i', audioPath,
      '-acodec', 'copy',
      chunkPath,
    ]);

    if (fs.existsSync(chunkPath)) {
      try {
        const chunkResult = await transcribeSingleFile(groq, chunkPath);
        fullTexts.push(chunkResult.fullText);
        chunkPromises.push({
          offsetSeconds: offset,
          segments: chunkResult.segments,
        });
      } catch (err) {
        console.error(`Chunk transcription error at offset ${offset}:`, err);
      }
    }
  }

  const stitched = stitchWhisperChunks(chunkPromises);
  const finalSegments: WhisperSegment[] = stitched.map((s, idx) => ({
    id: idx + 1,
    start: s.start,
    end: s.end,
    text: s.text,
  }));

  return {
    fullText: fullTexts.join(' '),
    segments: finalSegments,
    duration,
  };
}

/**
 * Test transcription with Groq Whisper Large V3 using a short synthesized test audio
 */
export async function testGroqConnection(customApiKey?: string): Promise<{ success: boolean; message: string; data?: any }> {
  const apiKey = customApiKey || process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GROQ_API_KEY') {
    return {
      success: false,
      message: 'GROQ_API_KEY မသတ်မှတ်ရသေးပါ။ AI Studio ၏ Secrets panel တွင် GROQ_API_KEY ကို ထည့်သွင်းပေးပါ။',
    };
  }

  try {
    const groq = new Groq({ apiKey });

    // Generate a quick 2-second WAV tone with sine wave for API connectivity verification
    const testAudioPath = '/tmp/groq_test_tone.wav';
    await execFileAsync('ffmpeg', [
      '-y',
      '-f', 'lavfi',
      '-i', 'sine=frequency=1000:duration=1.5',
      '-ar', '16000',
      '-ac', '1',
      testAudioPath,
    ]);

    const res: any = await groq.audio.transcriptions.create({
      file: fs.createReadStream(testAudioPath),
      model: 'whisper-large-v3',
      language: 'zh',
      response_format: 'verbose_json',
    });

    return {
      success: true,
      message: 'Groq Whisper Large V3 ချိတ်ဆက်မှု အောင်မြင်ပါသည်။ API Key မှန်ကန်ပါသည်။',
      data: {
        model: 'whisper-large-v3',
        language: 'zh',
        duration: res.duration || 1.5,
        receivedText: res.text || '(Audio Tone Tested)',
      },
    };
  } catch (err: any) {
    console.error('Groq connection test failed:', err);
    return {
      success: false,
      message: `Groq API အမှား: ${err.message || String(err)}`,
    };
  }
}
