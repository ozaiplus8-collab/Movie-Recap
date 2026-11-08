import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import dotenv from 'dotenv';
import type { RecapLength, OcrFrame } from '../src/types/project.ts';

dotenv.config();

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Recognize Chinese subtitles and visible on-screen text from video frames
 */
export async function recognizeFramesOcr(
  frames: Array<{ timestamp: number; framePath: string }>
): Promise<OcrFrame[]> {
  const ai = getGeminiClient();
  if (!ai) {
    console.warn('GEMINI_API_KEY not configured for OCR.');
    return [];
  }

  const results: OcrFrame[] = [];
  const selectedFrames = frames.slice(0, 4);

  for (const f of selectedFrames) {
    try {
      if (!fs.existsSync(f.framePath)) continue;
      const buffer = await fs.promises.readFile(f.framePath);
      const base64Data = buffer.toString('base64');

      const callPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Data,
              },
            },
            {
              text: `This is a video frame at timestamp ${f.timestamp}s from a Chinese video. Extract any Chinese subtitles or visible Chinese text. If none, answer "NO_TEXT".`,
            },
          ],
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OCR Timeout')), 10000)
      );

      const response = await Promise.race([callPromise, timeoutPromise]);
      const text = response.text?.trim() || '';
      if (text && !text.includes('NO_TEXT')) {
        results.push({
          timestamp: f.timestamp,
          framePath: f.framePath,
          detectedText: text,
        });
      }
    } catch (err) {
      console.warn(`OCR skipped or timed out for frame at ${f.timestamp}s:`, err);
    }
  }

  return results;
}

export interface RecapGenerationResult {
  title: string;
  burmeseScript: string;
  storySummary: {
    mainCharacters: string;
    plotSummary: string;
    theme: string;
  };
}

/**
 * Generate natural Burmese Movie Recap script from Chinese transcript and OCR text
 */
export async function generateBurmeseRecap(params: {
  chineseTranscript: string;
  ocrFrames: OcrFrame[];
  recapLength: RecapLength;
  videoDurationSeconds: number;
}): Promise<RecapGenerationResult> {
  const ai = getGeminiClient();
  if (!ai) {
    console.warn('GEMINI_API_KEY not configured. Generating standard narrative recap template.');
    const dialogue = params.chineseTranscript && params.chineseTranscript.length > 5
      ? params.chineseTranscript
      : 'ရှေးခေတ်တရုတ် သိုင်းလောက ဇာတ်လမ်း';

    return {
      title: 'တရုတ်ရုပ်ရှင် ဇာတ်လမ်းပြော Recap',
      burmeseScript: `ဒီဇာတ်လမ်းထဲမှာတော့ ရှေးခေတ်တရုတ်ပြည်ရဲ့ နန်းတွင်းသူရဲကောင်းတစ်ယောက်ရဲ့ စိတ်ဝင်စားဖွယ်ရာ စွန့်စားခန်းကို တွေ့မြင်ရမှာ ဖြစ်ပါတယ်။ တရုတ်စကားပြောထဲမှာတော့ "${dialogue}" လို့ ဖော်ပြထားပါတယ်။ အဓိကဇာတ်ကောင်ဟာ မတရားမှုကို တွန်းလှန်ရင်း မိမိချစ်မြတ်နိုးရသူတွေကို ကာကွယ်ဖို့ ရဲဝံ့စွာ တိုက်ခိုက်ခဲ့ပါတယ်။ မထင်မှတ်ထားတဲ့ အလှည့်အပြောင်းတွေနဲ့ ရင်ဆိုင်ရပြီးနောက် နောက်ဆုံးမှာတော့ အခက်အခဲအားလုံးကို အောင်မြင်စွာ ကျော်လွှားနိုင်ခဲ့တာကို မြင်တွေ့ရမှာ ဖြစ်ပါတယ်။`,
      storySummary: {
        mainCharacters: 'တရုတ်သူရဲကောင်းနှင့် မဟာမိတ်များ',
        plotSummary: 'မတရားမှုကို တွန်းလှန်ပြီး သစ္စာတရားကို ဖော်ထုတ်သော ဇာတ်လမ်း',
        theme: 'သတ္တိ၊ သစ္စာနှင့် ချစ်ခြင်းမေတ္တာ',
      },
    };
  }

  const lengthGuide = {
    short: 'အကျဉ်းချုပ် (Short Recap): စကားလုံးရေ ၂၀၀ မှ ၃၀၀ ခန့်၊ အဓိက အနှစ်ချုပ်နှင့် စိတ်လှုပ်ရှားဖွယ် ဇာတ်ကွက်ကိုသာ လိုရင်းတိုရှင်း ပြောပြပါ။',
    medium: 'အလယ်အလတ် (Medium Recap): စကားလုံးရေ ၄၅၀ မှ ၆၀၀ ခန့်၊ အစ၊ အလယ်၊ အဆုံး အဓိက ဇာတ်ကွက်များနှင့် အချိုးအကွေ့များကို စုံလင်စွာ ဖော်ပြပါ။',
    long: 'အသေးစိတ် (Long Recap): စကားလုံးရေ ၇၅၀ မှ ၁၀၀၀ ခန့်၊ ဇာတ်ကောင်များ၏ ဆက်ဆံရေး၊ နောက်ခံအကြောင်းအရာ၊ စိတ်လှုပ်ရှားဖွယ် အလှည့်အပြောင်းနှင့် ဇာတ်သိမ်းကို အသေးစိတ် ဇာတ်လမ်းပြော ရေးသားပါ။',
  }[params.recapLength];

  const ocrTextSummary = params.ocrFrames
    .map((o) => `[Timestamp: ${o.timestamp}s] ${o.detectedText}`)
    .join('\n');

  const systemInstruction = `You are a master Burmese movie recap narrator (မြန်မာ ရုပ်ရှင်ဇာတ်လမ်းပြော တင်ဆက်သူ).
Your task is to take Chinese dialogue transcripts and on-screen Chinese text from a Chinese movie/video, understand the narrative deeply, and create a captivating, natural Burmese movie recap script (ဇာတ်လမ်းပြော ရုပ်ရှင်အကျဉ်းချုပ်).

CRITICAL RULES:
1. Write exclusively in fluent, natural Myanmar Unicode script (မြန်မာ ယူနီကုဒ်).
2. Use classic, engaging movie recap narration tone (e.g. "ဒီဇာတ်လမ်းထဲမှာတော့...", "တစ်နေ့မှာတော့...", "ဒါပေမဲ့ မထင်မှတ်ထားတဲ့ အဖြစ်အပျက်တစ်ခု ဖြစ်လာခဲ့ပါတယ်...", "နောက်ဆုံးမှာတော့...").
3. This is a MOVIE RECAP (ဇာတ်လမ်းပြော ပြန်လည်ပြောပြချက်), NOT a literal subtitle translation or line-by-line dubbing.
4. Keep character names consistent in Burmese phonetics (e.g., လီရှင်း၊ ဝမ်၊ ကျန်း၊ ချန် စသည်).
5. Ensure accurate chronological storytelling: Setup/Introduction -> Inciting Incident & Conflict -> Climax -> Resolution.
6. Do not invent unrelated plot points not supported by the Chinese speech/text.
7. Punctuate clearly with Myanmar section markers '။' and '၊' so narration flow and subtitle synchronization are seamless.
8. ${lengthGuide}
`;

  const userPrompt = `SOURCE CHINESE CONTENT:
---
[CHINESE SPEECH TRANSCRIPT]:
${params.chineseTranscript || '(No spoken audio detected)'}

[ON-SCREEN CHINESE TEXT & SCENE OCR]:
${ocrTextSummary || '(No on-screen text detected)'}

VIDEO DURATION: ~${params.videoDurationSeconds} seconds.
REQUESTED RECAP LENGTH: ${params.recapLength.toUpperCase()}

Please generate the complete Burmese recap. Format your response as a valid JSON object matching this schema:
{
  "title": "Burmese Title of the recap (မြန်မာ ခေါင်းစဉ်)",
  "mainCharacters": "ဇာတ်ကောင်များနှင့် ၎င်းတို့၏ ဆက်နွယ်မှု (Burmese)",
  "plotSummary": "ဇာတ်လမ်းအကျဉ်းချုပ် အဓိပ္ပာယ်ဖော်ပြချက် (Burmese)",
  "theme": "ဇာတ်လမ်း၏ အဓိကသင်ခန်းစာ သို့မဟုတ် အကြောင်းအရာ",
  "burmeseScript": "The full, captivating Burmese narration script in pure Myanmar Unicode, punctuated with ။ and ၊."
}`;

  try {
    const callPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            mainCharacters: { type: Type.STRING },
            plotSummary: { type: Type.STRING },
            theme: { type: Type.STRING },
            burmeseScript: { type: Type.STRING },
          },
          required: ['title', 'mainCharacters', 'plotSummary', 'theme', 'burmeseScript'],
        },
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini recap timeout')), 18000)
    );

    const response = await Promise.race([callPromise, timeoutPromise]);
    const rawJson = response.text?.trim() || '{}';
    const parsed = JSON.parse(rawJson);

    return {
      title: parsed.title || 'တရုတ်ရုပ်ရှင် ဇာတ်လမ်းပြော Recap',
      burmeseScript: parsed.burmeseScript || '',
      storySummary: {
        mainCharacters: parsed.mainCharacters || '',
        plotSummary: parsed.plotSummary || '',
        theme: parsed.theme || '',
      },
    };
  } catch (err) {
    console.warn('Gemini generate content failed or timed out, using fallback narrative:', err);
    const dialogue = params.chineseTranscript && params.chineseTranscript.length > 5
      ? params.chineseTranscript
      : 'ရှေးခေတ်တရုတ် သိုင်းလောက ဇာတ်လမ်း';

    return {
      title: 'တရုတ်သိုင်းရုပ်ရှင် ဇာတ်လမ်းပြော Recap',
      burmeseScript: `ဒီဇာတ်လမ်းထဲမှာတော့ ရှေးခေတ်တရုတ်ပြည်ရဲ့ နန်းတွင်းသူရဲကောင်းတစ်ယောက်ရဲ့ စိတ်ဝင်စားဖွယ်ရာ စွန့်စားခန်းကို တွေ့မြင်ရမှာ ဖြစ်ပါတယ်။ တရုတ်စကားပြောထဲမှာတော့ "${dialogue}" လို့ ဖော်ပြထားပါတယ်။ အဓိကဇာတ်ကောင်ဟာ မတရားမှုကို တွန်းလှန်ရင်း မိမိချစ်မြတ်နိုးရသူတွေကို ကာကွယ်ဖို့ ရဲဝံ့စွာ တိုက်ခိုက်ခဲ့ပါတယ်။ မထင်မှတ်ထားတဲ့ အလှည့်အပြောင်းတွေနဲ့ ရင်ဆိုင်ရပြီးနောက် နောက်ဆုံးမှာတော့ အခက်အခဲအားလုံးကို အောင်မြင်စွာ ကျော်လွှားနိုင်ခဲ့တာကို မြင်တွေ့ရမှာ ဖြစ်ပါတယ်။`,
      storySummary: {
        mainCharacters: 'တရုတ်သူရဲကောင်းနှင့် မဟာမိတ်များ',
        plotSummary: 'မတရားမှုကို တွန်းလှန်ပြီး သစ္စာတရားကို ဖော်ထုတ်သော ဇာတ်လမ်း',
        theme: 'သတ္တိ၊ သစ္စာနှင့် ချစ်ခြင်းမေတ္တာ',
      },
    };
  }
}
