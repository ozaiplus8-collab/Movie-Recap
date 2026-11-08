import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSrtTimestamp,
  parseSrtTimestamp,
  generateSrtContent,
  generateSegmentsFromScript,
  stitchWhisperChunks
} from './subtitle.ts';

test('formatSrtTimestamp formats seconds correctly', () => {
  assert.equal(formatSrtTimestamp(0), '00:00:00,000');
  assert.equal(formatSrtTimestamp(65.432), '00:01:05,432');
  assert.equal(formatSrtTimestamp(3661.05), '01:01:01,050');
});

test('parseSrtTimestamp parses string to seconds correctly', () => {
  assert.equal(parseSrtTimestamp('00:00:00,000'), 0);
  assert.equal(parseSrtTimestamp('00:01:05,432'), 65.432);
});

test('generateSrtContent builds proper SRT formatted text', () => {
  const segments = [
    { id: 1, start: 0, end: 3.5, text: 'ဒီဇာတ်ကားမှာတော့ ရှေးခေတ်တရုတ်ပြည်ရဲ့' },
    { id: 2, start: 3.6, end: 7.2, text: 'သူရဲကောင်းတစ်ယောက်အကြောင်းကို ဖော်ပြထားပါတယ်။' }
  ];
  const srt = generateSrtContent(segments);
  assert.ok(srt.includes('00:00:00,000 --> 00:00:03,500'));
  assert.ok(srt.includes('သူရဲကောင်းတစ်ယောက်အကြောင်းကို'));
  assert.ok(srt.includes('00:00:03,600 --> 00:00:07,200'));
});

test('generateSegmentsFromScript creates segments from Burmese punctuation', () => {
  const script = 'ဒီဇာတ်လမ်းကတော့ စိတ်ဝင်စားစရာကောင်းပါတယ်။ အဓိကဇာတ်ကောင်ဟာ ရွာလေးတစ်ရွာမှာ မွေးဖွားခဲ့တာဖြစ်ပါတယ်။';
  const segments = generateSegmentsFromScript(script, 10);
  assert.ok(segments.length >= 2);
  assert.equal(segments[0].start, 0);
  assert.ok(segments[segments.length - 1].end > 0);
});

test('stitchWhisperChunks adjusts chunk offsets and deduplicates seam repeats', () => {
  const chunks = [
    {
      offsetSeconds: 0,
      segments: [
        { start: 0.5, end: 3.0, text: '你好世界' },
        { start: 3.2, end: 5.0, text: '这是测试' }
      ]
    },
    {
      offsetSeconds: 5.0,
      segments: [
        { start: 0.0, end: 1.8, text: '这是测试' }, // duplicate at boundary
        { start: 2.0, end: 4.5, text: '下一句对话' }
      ]
    }
  ];

  const stitched = stitchWhisperChunks(chunks);
  assert.equal(stitched.length, 3); // deduplicated
  assert.equal(stitched[0].start, 0.5);
  assert.equal(stitched[0].text, '你好世界');
  assert.equal(stitched[1].start, 3.2);
  assert.equal(stitched[1].text, '这是测试');
  assert.equal(stitched[2].start, 7.0);
  assert.equal(stitched[2].text, '下一句对话');
});
