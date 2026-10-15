/* «Ascolta la lezione»: the browser's own text-to-speech with an Italian voice. Free, nothing leaves the device. */

export function speechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof (window as any).SpeechSynthesisUtterance === 'function';
}

/** The most natural Italian voice the device offers (Edge "Natural", Google, Apple Alice/Federica…). */
export function italianVoice(): SpeechSynthesisVoice | null {
  if (!speechSupported()) return null;
  const it = window.speechSynthesis.getVoices().filter((v) => /^it([-_]|$)/i.test(v.lang));
  if (!it.length) return null;
  const rank = (v: SpeechSynthesisVoice) =>
    /natural|neural|online|premium|enhanced/i.test(v.name) ? 0
      : /google/i.test(v.name) ? 1
        : /alice|federica|elsa|isabella|paola|luca|diego|emma|giorgio/i.test(v.name) ? 2
          : v.localService ? 3 : 4;
  return [...it].sort((a, b) => rank(a) - rank(b))[0];
}

/** Lesson markdown to something pleasant to hear. */
export function plainText(md: string): string {
  return md
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => {
      const l = line.trim();
      if (!l) return '';
      if (l.startsWith('## ')) return l.slice(3).replace(/[.:;]?$/, '.');
      const item = l.replace(/^(-|\d+\.)\s+/, '');
      return item !== l ? item.replace(/[.:;,]?$/, '.') : l;
    })
    .join('\n')
    .replace(/\*\*/g, '')
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Sentence-sized pieces: Chrome stops long utterances after about 15 seconds. */
export function chunks(text: string, max = 220): string[] {
  const sentences = text.match(/[^.!?;:]+[.!?;:]*\s*/g) || [text];
  const out: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      out.push(cur.trim());
      cur = '';
    }
    if (s.length > max) {
      const words = s.split(/\s+/);
      for (const w of words) {
        if ((cur + ' ' + w).length > max && cur) {
          out.push(cur.trim());
          cur = '';
        }
        cur += (cur ? ' ' : '') + w;
      }
    } else cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

let token = 0;
let keep: SpeechSynthesisUtterance[] = []; // Chrome drops callbacks of utterances that get garbage-collected

/** Reads the text aloud, then calls onDone (unless stopped or replaced first). */
export function speak(text: string, rate: number, onDone?: () => void) {
  if (!speechSupported()) return;
  const synth = window.speechSynthesis;
  const my = ++token;
  const parts = chunks(text);
  let i = 0;
  const voice = italianVoice();
  const next = () => {
    if (my !== token) return;
    if (i >= parts.length) {
      keep = [];
      onDone?.();
      return;
    }
    const u = new SpeechSynthesisUtterance(parts[i++]);
    u.lang = voice?.lang || 'it-IT';
    if (voice) u.voice = voice;
    u.rate = rate;
    u.onend = next;
    u.onerror = (e: any) => {
      if (e?.error === 'interrupted' || e?.error === 'canceled') return;
      next();
    };
    keep.push(u);
    synth.speak(u);
  };
  if (synth.speaking || synth.pending) {
    synth.cancel();
    setTimeout(next, 60); // Chrome ignores a speak() issued in the same tick as cancel()
  } else {
    next();
  }
}

export function stopSpeaking() {
  token++;
  keep = [];
  if (speechSupported()) window.speechSynthesis.cancel();
}

export function pauseSpeaking() {
  if (speechSupported()) window.speechSynthesis.pause();
}

export function resumeSpeaking() {
  if (speechSupported()) window.speechSynthesis.resume();
}

export const RATES = [1, 1.25, 1.5, 0.85];

export function savedRate(): number {
  try {
    const r = Number(localStorage.getItem('lobby.tts.rate'));
    return RATES.includes(r) ? r : 1;
  } catch {
    return 1;
  }
}

export function saveRate(r: number) {
  try { localStorage.setItem('lobby.tts.rate', String(r)); } catch { /* private mode */ }
}
