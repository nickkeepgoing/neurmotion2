/**
 * Minimal radix-2 FFT + spectral helpers (no dependencies).
 * Used by the spiral test (radial-error signal) and rest-tremor test
 * (accelerometer magnitude) to measure power in the 4–7 Hz band.
 */

/** In-place iterative radix-2 Cooley–Tukey FFT. Arrays must be a power of 2. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if ((n & (n - 1)) !== 0) throw new Error('FFT size must be a power of 2');

  // bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cwRe = 1;
      let cwIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k];
        const uIm = im[i + k];
        const vRe = re[i + k + len / 2] * cwRe - im[i + k + len / 2] * cwIm;
        const vIm = re[i + k + len / 2] * cwIm + im[i + k + len / 2] * cwRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + len / 2] = uRe - vRe;
        im[i + k + len / 2] = uIm - vIm;
        const nRe = cwRe * wRe - cwIm * wIm;
        cwIm = cwRe * wIm + cwIm * wRe;
        cwRe = nRe;
      }
    }
  }
}

/**
 * Resample an irregularly-sampled signal {t (ms), v} to a uniform rate (Hz)
 * by linear interpolation. Returns the uniform samples.
 */
export function resampleUniform(t: number[], v: number[], hz: number): Float64Array {
  if (t.length < 2) return new Float64Array(0);
  const t0 = t[0];
  const dur = (t[t.length - 1] - t0) / 1000; // s
  const n = Math.floor(dur * hz);
  const out = new Float64Array(Math.max(n, 0));
  let j = 0;
  for (let i = 0; i < n; i++) {
    const ti = t0 + (i / hz) * 1000;
    while (j < t.length - 2 && t[j + 1] < ti) j++;
    const span = t[j + 1] - t[j] || 1;
    const a = (ti - t[j]) / span;
    out[i] = v[j] * (1 - a) + v[j + 1] * a;
  }
  return out;
}

/**
 * Fraction of total spectral power within [loHz, hiHz].
 * The DC bin is excluded so a constant offset doesn't dilute the ratio.
 */
export function bandPowerRatio(signal: Float64Array, sampleHz: number, loHz: number, hiHz: number): number {
  if (signal.length < 8) return 0;
  // next power of two ≥ length, zero-padded
  const n = 1 << Math.ceil(Math.log2(signal.length));
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  // remove mean (kills the DC bin properly)
  let mean = 0;
  for (const s of signal) mean += s;
  mean /= signal.length;
  for (let i = 0; i < signal.length; i++) re[i] = signal[i] - mean;
  fft(re, im);

  const df = sampleHz / n;
  let band = 0;
  let total = 0;
  for (let k = 1; k < n / 2; k++) {
    const p = re[k] * re[k] + im[k] * im[k];
    const f = k * df;
    total += p;
    if (f >= loHz && f <= hiHz) band += p;
  }
  return total > 0 ? band / total : 0;
}

/** Mean of an array. */
export function mean(a: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return a.length ? s / a.length : 0;
}

/** Sample standard deviation. */
export function std(a: ArrayLike<number>): number {
  if (a.length < 2) return 0;
  const m = mean(a);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - m) ** 2;
  return Math.sqrt(s / (a.length - 1));
}

/** Coefficient of variation (SD / |mean|). */
export function cv(a: ArrayLike<number>): number {
  const m = mean(a);
  return m !== 0 ? std(a) / Math.abs(m) : 0;
}

/** Least-squares slope of y over index (y per step). */
export function linearSlope(y: ArrayLike<number>): number {
  const n = y.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = mean(y);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - mx) * (y[i] - my);
    den += (i - mx) ** 2;
  }
  return den !== 0 ? num / den : 0;
}
