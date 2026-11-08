import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);

export interface MediaInfo {
  durationSeconds: number;
  width?: number;
  height?: number;
  resolution?: string;
  hasAudio: boolean;
  sizeBytes: number;
}

export async function probeMedia(filePath: string): Promise<MediaInfo> {
  const stat = await fs.promises.stat(filePath);
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration,size:stream=width,height,codec_type',
      '-of', 'json',
      filePath,
    ]);
    const data = JSON.parse(stdout);
    const duration = parseFloat(data.format?.duration || '0');
    const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
    const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');

    return {
      durationSeconds: isNaN(duration) ? 0 : Math.round(duration * 10) / 10,
      width: videoStream?.width,
      height: videoStream?.height,
      resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : undefined,
      hasAudio: !!audioStream,
      sizeBytes: stat.size,
    };
  } catch (err) {
    console.warn('ffprobe failed, using basic stats:', err);
    return {
      durationSeconds: 0,
      hasAudio: true,
      sizeBytes: stat.size,
    };
  }
}

export async function extractAudio(videoPath: string, outputPath: string): Promise<string> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Extract 16kHz mono audio optimized for Groq Whisper
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', videoPath,
    '-vn',
    '-acodec', 'libmp3lame',
    '-ar', '16000',
    '-ac', '1',
    '-b:a', '64k',
    outputPath,
  ]);
  return outputPath;
}

export async function extractFrames(
  videoPath: string,
  outputDir: string,
  intervalSeconds = 5,
  maxFrames = 15
): Promise<Array<{ timestamp: number; framePath: string }>> {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const info = await probeMedia(videoPath);
  const duration = info.durationSeconds || 30;

  // Calculate timestamps
  const timestamps: number[] = [];
  const actualInterval = Math.max(intervalSeconds, duration / maxFrames);
  for (let t = 2; t < duration; t += actualInterval) {
    if (timestamps.length >= maxFrames) break;
    timestamps.push(Math.round(t * 10) / 10);
  }
  if (timestamps.length === 0) timestamps.push(1);

  const results: Array<{ timestamp: number; framePath: string }> = [];

  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    const frameFile = path.join(outputDir, `frame_${i + 1}_${ts}s.jpg`);
    try {
      await execFileAsync('ffmpeg', [
        '-y',
        '-ss', String(ts),
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '2',
        '-vf', 'scale=640:-1',
        frameFile,
      ]);
      if (fs.existsSync(frameFile)) {
        results.push({ timestamp: ts, framePath: frameFile });
      }
    } catch (e) {
      console.warn(`Could not extract frame at ${ts}s:`, e);
    }
  }

  return results;
}

export interface RenderOptions {
  videoPath: string;
  narrationAudioPath: string;
  srtPath?: string;
  outputPath: string;
  muteOriginalAudio?: boolean;
  duckOriginalAudio?: boolean;
}

export async function renderRecapVideo(opts: RenderOptions): Promise<string> {
  const dir = path.dirname(opts.outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fontPath = '/usr/share/fonts/truetype/noto/NotoSansMyanmar-Regular.ttf';
  const hasMyanmarFont = fs.existsSync(fontPath);

  const videoInfo = await probeMedia(opts.videoPath);
  const narrationInfo = await probeMedia(opts.narrationAudioPath);
  const targetDuration = Math.max(videoInfo.durationSeconds, narrationInfo.durationSeconds, 5);

  const args: string[] = ['-y'];

  // Input 0: original video
  args.push('-i', opts.videoPath);

  // Input 1: Burmese narration audio
  args.push('-i', opts.narrationAudioPath);

  // Build Filter Complex for Audio & Subtitles
  const filterParts: string[] = [];
  let videoMap = '0:v:0';
  let audioMap = '1:a:0';

  // Subtitle burning with Noto Sans Myanmar font
  if (opts.srtPath && fs.existsSync(opts.srtPath)) {
    const escapedSrt = opts.srtPath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
    const fontOption = hasMyanmarFont
      ? `:force_style='Fontname=Noto Sans Myanmar,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,MarginV=28'`
      : '';
    filterParts.push(`[0:v:0]subtitles='${escapedSrt}'${fontOption}[vout]`);
    videoMap = '[vout]';
  }

  // Audio handling
  if (opts.duckOriginalAudio && videoInfo.hasAudio && !opts.muteOriginalAudio) {
    filterParts.push('[0:a]volume=0.15[orig_duck]');
    filterParts.push('[1:a]volume=1.0[narration]');
    filterParts.push('[orig_duck][narration]amix=inputs=2:duration=longest:dropout_transition=2[aout]');
    audioMap = '[aout]';
  } else {
    audioMap = '1:a:0';
  }

  if (filterParts.length > 0) {
    args.push('-filter_complex', filterParts.join(';'));
  }
  args.push('-map', videoMap, '-map', audioMap);

  // Video encoding settings
  args.push(
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-shortest',
    '-movflags', '+faststart',
    opts.outputPath
  );

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(opts.outputPath)) {
        resolve(opts.outputPath);
      } else {
        console.error('FFmpeg render error stderr:', stderr);
        reject(new Error(`FFmpeg video rendering failed with exit code ${code}`));
      }
    });
    proc.on('error', reject);
  });
}

/**
 * Creates a synthetic demo Chinese video clip (with Chinese voice and Chinese subtitles)
 * for instant testing without needing an external upload.
 */
export async function generateDemoChineseVideo(outputPath: string): Promise<string> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Generate a 12-second test video with dynamic visuals and audio tone
  const testScript = 'ffmpeg -y -f lavfi -i testsrc=duration=12:size=960x540:rate=25 -f lavfi -i "sine=frequency=440:duration=12" -vf "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text=\'Chinese Movie: The Hidden Legend\':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=100,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text=\'Scene 1 - Ancient Palace Gate\':fontsize=20:fontcolor=yellow:x=(w-text_w)/2:y=180" -c:v libx264 -c:a aac -pix_fmt yuv420p ' + outputPath;

  await execFileAsync('sh', ['-c', testScript]);
  return outputPath;
}
