/**
 * Facial (smile) test — metrics from MediaPipe Face Landmarker blendshapes.
 * Frames are processed locally and discarded; only numbers leave this module.
 *
 * Per frame we read mouthSmileLeft / mouthSmileRight (0–1) plus a small set
 * of expression blendshapes to estimate overall facial movement (hypomimia).
 */
import { mean } from './fft';

export type FaceFrame = {
  t: number;
  smileL: number;
  smileR: number;
  /** values of several expression blendshapes, for movement estimation */
  expr: number[];
};

export type FacialMetrics = {
  smileAmplitude: number; // peak (95th pct) of (L+R)/2
  asymmetry: number; // mean |L−R| relative to amplitude
  movement: number; // mean frame-to-frame blendshape delta
  frames: number;
};

export function computeFacialMetrics(frames: FaceFrame[]): FacialMetrics {
  if (frames.length < 5) return { smileAmplitude: 0, asymmetry: 0, movement: 0, frames: frames.length };

  const amps = frames.map((f) => (f.smileL + f.smileR) / 2).sort((a, b) => a - b);
  const smileAmplitude = amps[Math.floor(amps.length * 0.95)];

  const diffs = frames.map((f) => Math.abs(f.smileL - f.smileR));
  const asymmetry = mean(diffs) / Math.max(smileAmplitude, 0.1);

  // movement: average absolute change of expression blendshapes per frame
  const deltas: number[] = [];
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1].expr;
    const b = frames[i].expr;
    let d = 0;
    const n = Math.min(a.length, b.length);
    for (let k = 0; k < n; k++) d += Math.abs(b[k] - a[k]);
    if (n) deltas.push(d / n);
  }
  const movement = mean(deltas);

  return { smileAmplitude, asymmetry, movement, frames: frames.length };
}

/** Blendshape category names we sample for the movement metric. */
export const EXPRESSION_SHAPES = [
  'mouthSmileLeft',
  'mouthSmileRight',
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',
  'eyeSquintLeft',
  'eyeSquintRight',
  'cheekSquintLeft',
  'cheekSquintRight',
  'jawOpen',
];
