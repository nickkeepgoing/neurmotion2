import { S } from '../lib/strings';
import { VOICE_LEVEL } from '../lib/thresholds';

/** Where a given RMS sits along the meter, as 0–100 % of the bar (dB scale). */
export function levelPct(rms: number): number {
  const db = 20 * Math.log10(Math.max(rms, 1e-6)); // guard log10(0) = -Infinity
  const { floorDb, ceilDb } = VOICE_LEVEL;
  return Math.max(0, Math.min(100, ((db - floorDb) / (ceilDb - floorDb)) * 100));
}

export type LoudnessState = 'quiet' | 'good' | 'tooLoud';

/** RMS amplitude of an analyser's current waveform, 0–1. */
export function rmsFromAnalyser(analyser: AnalyserNode, buf: Uint8Array): number {
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128; // byte time-domain data is centred on 128
    sum += v * v;
  }
  return Math.sqrt(sum / buf.length);
}

/**
 * Smooths the level and decides the coarse state, with hysteresis.
 *
 * Both live screens need identical behaviour, and both were duplicating the
 * RMS loop. Keeping the envelope and the state machine here means the practice
 * run and the real run can never drift apart.
 */
export function createLevelTracker() {
  const { attack, release, dropFrac, goodRms, loudRms } = VOICE_LEVEL;
  let smoothed = 0;
  let state: LoudnessState = 'quiet';

  return {
    /** Feed one frame's RMS; returns what to draw. */
    push(rms: number): { pct: number; state: LoudnessState } {
      smoothed += (rms - smoothed) * (rms > smoothed ? attack : release);

      // rising needs the full threshold, falling needs to clear it by a margin
      if (state === 'tooLoud') {
        if (smoothed < loudRms * dropFrac) state = smoothed >= goodRms ? 'good' : 'quiet';
      } else if (state === 'good') {
        if (smoothed >= loudRms) state = 'tooLoud';
        else if (smoothed < goodRms * dropFrac) state = 'quiet';
      } else {
        if (smoothed >= loudRms) state = 'tooLoud';
        else if (smoothed >= goodRms) state = 'good';
      }

      return { pct: levelPct(smoothed), state };
    },
  };
}

const STATE_STYLE: Record<LoudnessState, string> = {
  quiet: 'text-[#8A6A0E] bg-risk-med-bg',
  good: 'text-risk-low-text bg-risk-low-bg',
  tooLoud: 'text-risk-high-text bg-risk-high-bg',
};
const BAR_FILL: Record<LoudnessState, string> = {
  quiet: 'bg-[#E8B93C]',
  good: 'bg-risk-low',
  tooLoud: 'bg-risk-high',
};

/**
 * Live loudness bar with a marked target band.
 *
 * The test used to show only a frequency spectrum, which is pretty but does
 * not answer the one question the user has while holding "อาาา": am I loud
 * enough? A too-quiet take fails the voicing gate only at the END of the five
 * seconds, so without this the first they hear of it is being asked to start
 * over.
 *
 * Everything here is built so that NOTHING moves except the bar and one word:
 *
 *  - the status sits on its own full-width row, so swapping a long label for a
 *    short one cannot change the card's height. It previously shared a wrapping
 *    row with the title, so each state change re-wrapped the row and the card
 *    juddered — worse at larger text sizes, where the row wrapped sooner;
 *  - the bar's geometry is in pixels, not rem, so the accessibility type scale
 *    resizes the labels around the instrument without resizing the instrument;
 *  - there is no CSS transition on the fill. The caller updates the width every
 *    animation frame, and a transition restarting each frame fights it and
 *    stutters. Smoothing belongs in the envelope (see createLevelTracker), not
 *    in the compositor.
 *
 * `barRef` is driven imperatively by the caller's animation frame — setting
 * React state 60x/s just to move a bar would re-render the whole screen.
 */
export default function LoudnessMeter({
  barRef,
  state,
}: {
  barRef: React.RefObject<HTMLDivElement>;
  state: LoudnessState;
}) {
  const goodStart = levelPct(VOICE_LEVEL.goodRms);
  const goodEnd = levelPct(VOICE_LEVEL.loudRms);

  return (
    <div className="w-full bg-white rounded-tile shadow-card px-4 py-4 flex flex-col gap-3">
      <span className="text-lg font-extrabold text-ink">{S.voiceLevel.title}</span>

      <div>
        <div
          className="relative h-[38px] rounded-full bg-line-warm overflow-hidden"
          role="meter"
          aria-label={S.voiceLevel.title}
          aria-valuetext={S.voiceLevel[state]}
        >
          {/* target band — the region the user is aiming to reach */}
          <div
            className="absolute inset-y-0 bg-risk-low-bg"
            style={{ left: `${goodStart}%`, width: `${goodEnd - goodStart}%` }}
          />
          {/* live level */}
          <div ref={barRef} className={`absolute inset-y-0 left-0 rounded-full ${BAR_FILL[state]}`} style={{ width: '0%' }} />
          {/* the "reach at least here" mark, over the fill so it stays visible */}
          <div className="absolute inset-y-0 w-[3px] bg-risk-low-text" style={{ left: `${goodStart}%` }} />
        </div>

        {/* a bare line is not self-explanatory; the label is static so it never
            contributes to reflow */}
        <div className="relative h-[26px] mt-1">
          <span
            className="absolute top-0 -translate-x-1/2 text-sm font-bold text-risk-low-text whitespace-nowrap"
            style={{ left: `${goodStart}%` }}
          >
            ↑ {S.voiceLevel.target}
          </span>
        </div>
      </div>

      {/* full-width and centred: only the word inside changes, never the box */}
      <div className={`w-full rounded-ctl py-2.5 text-center text-xl font-extrabold ${STATE_STYLE[state]}`}>
        {S.voiceLevel[state]}
      </div>

      <span className="text-base font-semibold text-muted text-center leading-relaxed">{S.voiceLevel.hint}</span>
    </div>
  );
}
