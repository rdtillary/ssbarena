import type { TranscriptToken } from '@/lib/types';

const GROQ = 'https://api.groq.com/openai/v1';
const STT_MODEL = process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo';
// Nudges Whisper to keep "uh", "um" and repeated words instead of cleaning them up.
export const STT_PROMPT = 'Umm, let me think. Uh, so, the- the government, uh, it, it was, um, important.';

const FILLERS = new Set(['uh', 'um', 'umm', 'uhh', 'uhm', 'er', 'erm', 'ah', 'hmm', 'hm', 'mm', 'mmm', 'eh']);
export const PAUSE_MIN = 1.2;
const LONG_PAUSE = 3;

export type RawWord = { word: string; start: number; end: number };
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
export const flat = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

export async function transcribe(file: File, apiKey: string) {
  const fd = new FormData();
  fd.append('file', file, file.name || 'narration.webm');
  fd.append('model', STT_MODEL);
  fd.append('response_format', 'verbose_json');
  fd.append('timestamp_granularities[]', 'word');
  fd.append('timestamp_granularities[]', 'segment');
  fd.append('language', 'en');
  fd.append('temperature', '0');
  fd.append('prompt', STT_PROMPT);
  const res = await fetch(`${GROQ}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: fd,
  });
  if (!res.ok) {
    console.error('Groq STT error', res.status, await res.text().catch(() => ''));
    throw new Error(
      res.status === 429
        ? 'The free speech service is busy. Wait a few seconds and press Retry.'
        : `Transcription failed (${res.status}).`
    );
  }
  return res.json();
}

export function analyseWords(raw: RawWord[]) {
  const words = raw
    .map((w) => ({ text: w.word.trim(), n: norm(w.word), start: w.start, end: w.end }))
    .filter((w) => w.n);
  const kind: ('word' | 'filler' | 'stammer')[] = words.map(() => 'word');

  words.forEach((w, i) => {
    if (FILLERS.has(w.n)) {
      kind[i] = 'filler';
      return;
    }
    const parts = w.n.split('-').filter(Boolean);
    const cutOff = /-$/.test(w.text) && parts.length === 1 && parts[0].length <= 4;
    const fragment = parts.length >= 2 && parts[0].length <= 3 && parts.slice(1).join('').startsWith(parts[0]);
    if (cutOff || fragment) {
      kind[i] = 'stammer';
      return;
    }
    if (i > 0 && w.n === words[i - 1].n && kind[i - 1] !== 'filler') kind[i] = 'stammer';
  });
  for (let i = 3; i < words.length; i++) {
    if (words[i].n === words[i - 2].n && words[i - 1].n === words[i - 3].n && words[i].n !== words[i - 1].n) {
      if (kind[i] === 'word') kind[i] = 'stammer';
      if (kind[i - 1] === 'word') kind[i - 1] = 'stammer';
    }
  }

  const tokens: TranscriptToken[] = [];
  let pauseCount = 0;
  let longestPause = 0;
  words.forEach((w, i) => {
    const gap = i === 0 ? w.start : w.start - words[i - 1].end;
    if (gap >= (i === 0 ? 2 : PAUSE_MIN)) {
      pauseCount++;
      longestPause = Math.max(longestPause, gap);
      tokens.push({ type: 'pause', text: `${gap.toFixed(1)}s`, seconds: Number(gap.toFixed(1)) });
    }
    tokens.push({ type: kind[i], text: w.text });
  });

  return {
    tokens,
    wordCount: kind.filter((k) => k !== 'filler').length,
    fillerCount: kind.filter((k) => k === 'filler').length,
    stammerCount: kind.filter((k) => k === 'stammer').length,
    pauseCount,
    longPauses: tokens.filter((t) => t.type === 'pause' && (t.seconds || 0) >= LONG_PAUSE).length,
    longestPause: Number(longestPause.toFixed(1)),
    lastEnd: words.length ? words[words.length - 1].end : 0,
  };
}
