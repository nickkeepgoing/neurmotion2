/**
 * Rest tremor test — DeviceMotion accelerometer analysis.
 * ~10 s of acceleration magnitude while the phone is held still;
 * we measure spectral power in the 4–7 Hz parkinsonian band.
 */
import { bandPowerRatio, mean, resampleUniform } from './fft';
import { TREMOR, TREMOR_BAND } from './thresholds';

export type MotionSample = { t: number; mag: number };

export type TremorMetrics = {
  tremorBandPower: number; // fraction of power in 4–7 Hz
  rmsAccel: number; // RMS of mean-removed acceleration magnitude (m/s²)
  samples: number;
};

export function computeTremorMetrics(samples: MotionSample[]): TremorMetrics {
  if (samples.length < 20) return { tremorBandPower: 0, rmsAccel: 0, samples: samples.length };

  const t = samples.map((s) => s.t);
  const v = samples.map((s) => s.mag);
  const uniform = resampleUniform(t, v, TREMOR.sampleHz);

  const m = mean(uniform);
  let sq = 0;
  for (const s of uniform) sq += (s - m) ** 2;
  const rmsAccel = Math.sqrt(sq / (uniform.length || 1));

  const tremorBandPower = bandPowerRatio(uniform, TREMOR.sampleHz, TREMOR_BAND.lo, TREMOR_BAND.hi);
  return { tremorBandPower, rmsAccel, samples: samples.length };
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
