import { S } from '../lib/strings';
import { VOICE_LEVEL } from '../lib/thresholds';

/** Where a given RMS sits along the meter, as 0–100 % of the bar (dB scale). */
export function levelPct(rms: number): number {
  const db = 20 * Math.log10(Math.max(rms, 1e-6)); // guard log10(0) = -Infinity
  const { floorDb, ceilDb } = VOICE_LEVEL;
  return Math.max(0, Math.min(100, ((db - floorDb) / (ceilDb - floorDb)) * 100));
}

export type LoudnessState = 'quiet' | 'good' | 'tooLoud';

export function loudnessState(rms: number): LoudnessState {
  if (rms >= VOICE_LEVEL.loudRms) return 'tooLoud';
  if (rms >= VOICE_LEVEL.goodRms) return 'good';
  return 'quiet';
}

const STATE_STYLE: Record<LoudnessState, string> = {
  quiet: 'text-[#9C7A10] bg-risk-med-bg',
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
    <div className="w-full bg-white rounded-[20px] shadow-[0_4px_16px_rgba(35,58,77,.08)] px-4 py-4 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="text-lg font-extrabold text-ink whitespace-nowrap">{S.voiceLevel.title}</span>
        <span className={`flex-none text-base font-extrabold rounded-full px-3.5 py-1.5 whitespace-nowrap ${STATE_STYLE[state]}`}>
          {S.voiceLevel[state]}
        </span>
      </div>

      <div
        className="relative h-9 rounded-full bg-line-warm overflow-hidden"
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
        <div
          ref={barRef}
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-75 ${BAR_FILL[state]}`}
          style={{ width: '0%' }}
        />
        {/* the "reach at least here" mark, drawn over the fill so it stays visible */}
        <div className="absolute inset-y-0 w-1 bg-risk-low-text rounded-full" style={{ left: `${goodStart}%` }} />
      </div>

      {/* the mark needs a word next to it — a bare line is not self-explanatory */}
      <div className="relative h-6">
        <span
          className="absolute text-base font-bold text-risk-low-text whitespace-nowrap -translate-x-1/2"
          style={{ left: `${goodStart}%` }}
        >
          ↑ {S.voiceLevel.target}
        </span>
      </div>
    </div>
  );
}
