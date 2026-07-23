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
  return out;
}

/** Below this radius (px) the angle about the centre is too noisy to trust. */
const MIN_REGISTRATION_RADIUS = 15;

/**
 * Recover the trace's angular origin θ0.
 *
 * The user starts on the centre dot, where atan2 is numerically meaningless —
 * the first sample's angle is essentially arbitrary in (−π, π]. Since the
 * template radius is r = b·θ, an uncorrected offset becomes a CONSTANT radial
 * bias of b·θ0 — up to half the gap between turns — so a perfectly traced
 * spiral could score as badly off-template. (The previous
 * `round(θ[0] / 2π) · 2π` correction was a no-op: that expression is 0 for
 * every value atan2 can return.)
 *
 * We therefore pick the θ0 that minimises RMS radial error, ignoring points
 * near the centre where the angle is ill-conditioned.
 */
function registerTheta(theta: number[], radii: number[], b: number): number[] {
  const usable: number[] = [];
  for (let i = 0; i < radii.length; i++) if (radii[i] >= MIN_REGISTRATION_RADIUS) usable.push(i);
  if (usable.length < 5) return theta;

  let best = 0;
  let bestErr = Infinity;
  for (let k = -Math.PI; k <= Math.PI; k += 0.02) {
    let sum = 0;
    let n = 0;
    for (const i of usable) {
      const th = theta[i] - k;
      if (th <= 0) continue; // template undefined behind the origin
      const e = radii[i] - b * th;
      sum += e * e;
      n++;
    }
    if (n >= 5 && sum / n < bestErr) {
      bestErr = sum / n;
      best = k;
    }
  }
  return theta.map((t) => t - best);
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

  const radii = pts.map((p) => Math.hypot(p.x - cx, p.y - cy));
  const theta = registerTheta(unwrapTheta(pts, cx, cy), radii, b);
  const turnGap = 2 * Math.PI * b;

  // --- radial error vs template (skip the ill-conditioned centre) ---
  const errs: number[] = [];
  const errT: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (radii[i] < MIN_REGISTRATION_RADIUS) continue;
    const rTemplate = b * Math.max(theta[i], 0);
    errs.push(radii[i] - rTemplate);
    errT.push(pts[i].t);
  }
  if (errs.length < 5) {
    return { rmsErrorNorm: 1, tremorBandPower: 0, spacingCV: 1, speedCV: 1, coverage: 0 };
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
      crossR.push(radii[i]);
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
