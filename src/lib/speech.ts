/**
 * Thai voice guidance via the Web Speech API (speechSynthesis).
 * Availability of a th-TH voice depends on the device (Android Google TTS and
 * iOS "Kanya" both ship Thai). Fails silently where unsupported.
 */

let thaiVoice: SpeechSynthesisVoice | null = null;

function pickThaiVoice(): SpeechSynthesisVoice | null {
  if (thaiVoice) return thaiVoice;
  const voices = window.speechSynthesis?.getVoices() ?? [];
  thaiVoice = voices.find((v) => v.lang.toLowerCase().startsWith('th')) ?? null;
  return thaiVoice;
}

// voices load async in some browsers
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => pickThaiVoice();
}

export function speak(text: string): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\s*\n\s*/g, ' '));
    u.lang = 'th-TH';
    u.rate = 0.95; // slightly slow, elderly-friendly
    const v = pickThaiVoice();
    if (v) u.voice = v;
    synth.speak(u);
  } catch {
    /* no speech support — silent no-op */
  }
}

export function stopSpeaking(): void {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}
