/**
 * Spiral tracing test — template generation + metrics.
 *
 * Template: Archimedean spiral r = b·θ, θ ∈ [0, θmax].
 * The user traces it; we capture {x, y, t} points and compare the user's
 * radius at each unwrapped angle against the template radius b·θ.
 */
import { bandPowerRatio, cv, resampleUniform } from './fft';
import { TREMOR_BAND } from './thresholds';

export type Pt = { x: number; y: number; t: number };

export const SPIRAL_TURNS = 3; // θmax = 3 full turns = 6π
export const THETA_MAX = SPIRAL_TURNS * 2 * Math.PI;

/** b such that the spiral's outer radius fits `maxRadius`. */
export function spiralB(maxRadius: number): number {
  return maxRadius / THETA_MAX;
}

/** Template polyline points (for canvas rendering). */
export function templatePoints(cx: number, cy: number, b: number, step = 0.05): Pt[] {
  const pts: Pt[] = [];
  for (let th = 0; th <= THETA_MAX; th += step) {
    pts.push({ x: cx + b * th * Math.cos(th), y: cy + b * th * Math.sin(th), t: 0 });
  }
  return pts;
}

/**
 * Unwrap the user's angular position around the center so θ increases
 * monotonically across windings (atan2 alone wraps every 2π).
 */
function unwrapTheta(pts: Pt[], cx: number, cy: number): number[] {
  const out: number[] = [];
  let prev = 0;
  let offset = 0;
  for (let i = 0; i < pts.length; i++) {
    const raw = Math.atan2(pts[i].y - cy, pts[i].x - cx);
    if (i > 0) {
      let d = raw - prev;
      if (d > Math.PI) offset -= 2 * Math.PI;
      else if (d < -Math.PI) offset += 2 * Math.PI;
    }
    prev = raw;
    out.push(raw + offset);
  }
  // shift so the trace starts near θ≈0 at the center
  if (out.length) {
    const shift = Math.round(out[0] / (2 * Math.PI)) * 2 * Math.PI;
    for (let i = 0; i < out.length; i++) out[i] -= shift;
  }
  return out;
}

export type SpiralMetrics = {
  rmsErrorNorm: number; // RMS radial error / turn gap (2πb)
  tremorBandPower: number; // fraction of error-signal power in 4–7 Hz
  spacingCV: number; // CV of measured inter-turn spacing
  speedCV: number; // CV of drawing speed
  coverage: number; // fraction of the spiral actually traced (0–1)
};

export function computeSpiralMetrics(pts: Pt[], cx: number, cy: number, b: number): SpiralMetrics {
  if (pts.length < 10) {
    return { rmsErrorNorm: 1, tremorBandPower: 0, spacingCV: 1, speedCV: 1, coverage: 0 };
  }

  const theta = unwrapTheta(pts, cx, cy);
  const turnGap = 2 * Math.PI * b;

  // --- radial error vs template ---
  const errs: number[] = [];
  const errT: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const r = Math.hypot(pts[i].x - cx, pts[i].y - cy);
    const rTemplate = b * Math.max(theta[i], 0);
    errs.push(r - rTemplate);
    errT.push(pts[i].t);
  }
  const rms = Math.sqrt(errs.reduce((s, e) => s + e * e, 0) / errs.length);
  const rmsErrorNorm = rms / turnGap;

  // --- tremor band power of the radial-error-vs-time signal ---
  const uniform = resampleUniform(errT, errs, 60);
  const tremorBandPower = bandPowerRatio(uniform, 60, TREMOR_BAND.lo, TREMOR_BAND.hi);

  // --- inter-turn spacing: user's radius each time θ crosses a full turn ---
  const crossR: number[] = [];
  let nextCross = 2 * Math.PI;
  for (let i = 1; i < pts.length; i++) {
    if (theta[i - 1] < nextCross && theta[i] >= nextCross) {
      crossR.push(Math.hypot(pts[i].x - cx, pts[i].y - cy));
      nextCross += 2 * Math.PI;
    }
  }
  const gaps: number[] = [];
  for (let i = 1; i < crossR.length; i++) gaps.push(crossR[i] - crossR[i - 1]);
  if (crossR.length) gaps.unshift(crossR[0]); // center → first turn
  const spacingCV = gaps.length >= 2 ? cv(gaps) : 0;

  // --- smoothness: CV of speed ---
  const speeds: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    const dt = pts[i].t - pts[i - 1].t;
    if (dt > 0) speeds.push(Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) / dt);
  }
  const speedCV = cv(speeds);

  const coverage = Math.min(Math.max(theta[theta.length - 1] / THETA_MAX, 0), 1);

  return { rmsErrorNorm, tremorBandPower, spacingCV, speedCV, coverage };
}
