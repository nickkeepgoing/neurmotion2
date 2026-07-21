/**
 * Facial / head-movement test — head-turn (yaw) range of motion.
 *
 * Instead of a smile, we assess head turning left↔right, in the spirit of the
 * cranial-nerve / neck movement screen (cf. MSD Manuals, "How To Assess the
 * Cranial Nerves"): reduced range of motion, marked left/right asymmetry, or
 * jerky/rigid movement can accompany neurological disease.
 *
 * Frames are processed locally and discarded; only numbers leave this module.
 */
import { cv } from './fft';

/** Minimal landmark shape (MediaPipe normalized coords). */
type LM = { x: number; y: number };

/**
 * Estimate head yaw (deg, signed) from face landmarks. Uses the nose tip's
 * horizontal position relative to the midpoint of the face outline (cheek
 * landmarks), normalized by half the face width. ±1 proxy ≈ ±60°.
 */
export function computeYawDeg(landmarks: LM[] | undefined): number | null {
  if (!landmarks || landmarks.length < 468) return null;
  const nose = landmarks[1];
  const right = landmarks[234]; // face outline, one side
  const left = landmarks[454]; // face outline, other side
  if (!nose || !left || !right) return null;
  const mid = (left.x + right.x) / 2;
  const half = Math.abs(right.x - left.x) / 2;
  if (half < 1e-4) return null;
  const proxy = Math.max(-1.4, Math.min(1.4, (nose.x - mid) / half));
  return proxy * 60;
}

export type FaceFrame = { t: number; yawDeg: number };

export type FacialMetrics = {
  turnRangeDeg: number; // total left + right sweep
  turnAsymmetry: number; // |left − right| / max(left, right)
  turnSmoothness: number; // CV of angular speed (jerkiness)
  leftDeg: number;
  rightDeg: number;
  frames: number;
};

export function computeFacialMetrics(frames: FaceFrame[]): FacialMetrics {
  if (frames.length < 5) {
    return { turnRangeDeg: 0, turnAsymmetry: 1, turnSmoothness: 1, leftDeg: 0, rightDeg: 0, frames: frames.length };
  }

  // Re-centre on the median yaw so a slightly off-axis camera doesn't bias
  // one side. Then the sweep to each side is measured from that centre.
  const sorted = frames.map((f) => f.yawDeg).sort((a, b) => a - b);
  const centre = sorted[Math.floor(sorted.length / 2)];
  const rightDeg = Math.max(0, Math.max(...frames.map((f) => f.yawDeg)) - centre);
  const leftDeg = Math.max(0, centre - Math.min(...frames.map((f) => f.yawDeg)));

  const turnRangeDeg = leftDeg + rightDeg;
  const turnAsymmetry = Math.abs(leftDeg - rightDeg) / Math.max(leftDeg, rightDeg, 1);

  // smoothness: CV of angular speed between consecutive frames
  const speeds: number[] = [];
  for (let i = 1; i < frames.length; i++) {
    const dt = (frames[i].t - frames[i - 1].t) / 1000;
    if (dt > 0) speeds.push(Math.abs(frames[i].yawDeg - frames[i - 1].yawDeg) / dt);
  }
  const turnSmoothness = cv(speeds.filter((s) => s > 1)); // ignore near-still frames

  return { turnRangeDeg, turnAsymmetry, turnSmoothness, leftDeg, rightDeg, frames: frames.length };
}
