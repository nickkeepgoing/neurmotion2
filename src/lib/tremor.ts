/**
 * Tremor test — DeviceMotion accelerometer analysis, two phases:
 *   1. POSTURAL: phone held up in the hand, arm unsupported (action/postural).
 *   2. REST: forearm rested on a table/lap, phone held still (rest tremor).
 *
 * Rest tremor (present when the limb is supported and at rest) is the most
 * specific parkinsonian sign — a limb that is steady in the air but shakes
 * once the arm is rested is exactly the pattern this two-phase test captures.
 *
 * For each phase we measure:
 *   - bandPower: fraction of acceleration power in the 4–7 Hz tremor band
 *     (scale-invariant, so it catches small but coherent oscillation).
 *   - rms: RMS of mean-removed acceleration magnitude (m/s²) = amplitude.
 */
import { bandPowerRatio, mean, resampleUniform } from './fft';
import { TREMOR, TREMOR_BAND } from './thresholds';

export type MotionSample = { t: number; mag: number };

export type PhaseMetrics = { bandPower: number; rms: number; samples: number };

export function computePhaseMetrics(samples: MotionSample[]): PhaseMetrics {
  if (samples.length < 20) return { bandPower: 0, rms: 0, samples: samples.length };

  const t = samples.map((s) => s.t);
  const v = samples.map((s) => s.mag);
  const uniform = resampleUniform(t, v, TREMOR.sampleHz);

  const m = mean(uniform);
  let sq = 0;
  for (const s of uniform) sq += (s - m) ** 2;
  const rms = Math.sqrt(sq / (uniform.length || 1));

  const bandPower = bandPowerRatio(uniform, TREMOR.sampleHz, TREMOR_BAND.lo, TREMOR_BAND.hi);
  return { bandPower, rms, samples: samples.length };
}

export type TremorMetrics = {
  restBandPower: number;
  restRms: number;
  posturalBandPower: number;
  posturalRms: number;
  samples: number;
};

/** Combine the two phases' raw samples into the scored metric set. */
export function combineTremor(postural: MotionSample[], rest: MotionSample[]): TremorMetrics {
  const p = computePhaseMetrics(postural);
  const r = computePhaseMetrics(rest);
  return {
    restBandPower: r.bandPower,
    restRms: r.rms,
    posturalBandPower: p.bandPower,
    posturalRms: p.rms,
    samples: p.samples + r.samples,
  };
}

/** iOS 13+ requires an explicit permission call from a user gesture. */
export async function requestMotionPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (typeof DeviceMotionEvent === 'undefined') return 'unsupported';
  const anyDM = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
  if (typeof anyDM.requestPermission === 'function') {
    try {
      const res = await anyDM.requestPermission();
      return res === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }
  return 'granted'; // non-iOS: no explicit permission step
}
