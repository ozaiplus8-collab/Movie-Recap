/**
 * Subtitle and timing utilities for Burmese Recap Video Generation
 */

export interface SubtitleSegment {
  id: number;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

/**
 * Format seconds (e.g. 65.432) to SRT timestamp "00:01:05,432"
 */
export function formatSrtTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  const pad = (num: number, size = 2) => String(num).padStart(size, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(millis, 3)}`;
}

/**
 * Parse an SRT timestamp string "00:01:05,432" into seconds (65.432)
 */
export function parseSrtTimestamp(timestamp: string): number {
  const parts = timestamp.trim().replace(',', '.').split(':');
  if (parts.length !== 3) return 0;
  const hours = parseFloat(parts[0]) || 0;
  const minutes = parseFloat(parts[1]) || 0;
  const seconds = parseFloat(parts[2]) || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Generate standard SRT subtitle content from an array of segments
 */
export function generateSrtContent(segments: SubtitleSegment[]): string {
  return segments
    .filter(seg => seg.text && seg.text.trim().length > 0)
    .map((seg, index) => {
      const startStr = formatSrtTimestamp(seg.start);
      const endStr = formatSrtTimestamp(seg.end);
      return `${index + 1}\n${startStr} --> ${endStr}\n${seg.text.trim()}\n`;
    })
    .join('\n');
}

/**
 * Break long Burmese text into readable subtitle segments based on total duration
 */
export function generateSegmentsFromScript(
  scriptText: string,
  totalDurationSeconds: number
): SubtitleSegment[] {
  if (!scriptText || !scriptText.trim()) return [];

  // Split script by sentences or punctuation (Myanmar section mark '။', comma '၊', period, or newline)
  const rawSentences = scriptText
    .split(/([။၊\n\.\?!]+)/)
    .reduce<string[]>((acc, part, i, arr) => {
      if (i % 2 === 0) {
        const punctuation = arr[i + 1] || '';
        const combined = (part + punctuation).trim();
        if (combined) acc.push(combined);
      }
      return acc;
    }, []);

  const sentences = rawSentences.filter(s => s.trim().length > 0);
  if (sentences.length === 0) return [];

  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
  let currentStart = 0;
  const minDurationPerLine = 1.8;

  return sentences.map((sentence, idx) => {
    const proportion = totalChars > 0 ? sentence.length / totalChars : 1 / sentences.length;
    let segDuration = Math.max(minDurationPerLine, proportion * totalDurationSeconds);

    // If last sentence, cap at totalDurationSeconds or extend appropriately
    let currentEnd = currentStart + segDuration;
    if (idx === sentences.length - 1 && currentEnd < totalDurationSeconds) {
      currentEnd = totalDurationSeconds;
    }

    const segment: SubtitleSegment = {
      id: idx + 1,
      start: Number(currentStart.toFixed(2)),
      end: Number(currentEnd.toFixed(2)),
      text: sentence.trim()
    };

    currentStart = currentEnd + 0.1; // 100ms breath gap
    return segment;
  });
}

/**
 * Stitch Whisper chunk transcription segments with timestamp offset
 */
export function stitchWhisperChunks(
  chunks: Array<{ offsetSeconds: number; segments: Array<{ start: number; end: number; text: string }> }>
): Array<{ start: number; end: number; text: string }> {
  const result: Array<{ start: number; end: number; text: string }> = [];

  for (const chunk of chunks) {
    for (const seg of chunk.segments) {
      const adjustedStart = Number((seg.start + chunk.offsetSeconds).toFixed(2));
      const adjustedEnd = Number((seg.end + chunk.offsetSeconds).toFixed(2));
      const cleanText = seg.text ? seg.text.trim() : '';
      if (!cleanText) continue;

      // Avoid immediate duplicate sentence at seam
      const prev = result[result.length - 1];
      if (prev && prev.text === cleanText && Math.abs(prev.end - adjustedStart) < 1.0) {
        continue;
      }

      result.push({
        start: adjustedStart,
        end: adjustedEnd,
        text: cleanText
      });
    }
  }

  return result;
}
