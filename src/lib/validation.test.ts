/**
 * Technical validation harness.
 *
 * WHAT THIS IS: proof that the signal processing and scoring behave as
 * specified, checked against synthetic signals whose ground truth we control —
 * a 5 Hz tremor really is 5 Hz because we generated it.
 *
 * WHAT THIS IS NOT: clinical validation. It says nothing about sensitivity or
 * specificity in real patients, because we have no patient data. Every number
 * printed here is a measurement-correctness check, not a diagnostic accuracy
 * figure, and it must never be presented as one.
 *
 * Run:  npx tsx src/lib/validation.test.ts
 */
import { bandPowerRatio, resampleUniform } from './fft';
import { combineTapping } from './tapping';
import { combineTremor } from './tremor';
import {
  computeOverallScore,
  computeSubScore,
  highRiskStreak,
  overallRiskLevel,
  riskLevel,
} from './scoring';
import { TREMOR_BAND } from './thresholds';
import type { MotionSample } from './tremor';
import type { Session, TestResult } from './types';

// ---------------------------------------------------------------- utilities
let passed = 0;
let failed = 0;
const rows: string[] = [];

function check(name: string, actual: string | number, expect: string, ok: boolean) {
  (ok ? passed++ : failed++);
  rows.push(`${ok ? ' PASS' : ' FAIL'} │ ${name.padEnd(46)} │ ${String(actual).padStart(10)} │ ${expect}`);
}
const f = (n: number, d = 3) => n.toFixed(d);

function section(title: string) {
  rows.push('');
  rows.push(`── ${title} ${'─'.repeat(Math.max(0, 74 - title.length))}`);
}

/** Deterministic pseudo-random in [-1,1], so every run prints the same table. */
function rnd(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 0xffffffff) * 2 - 1;
  };
}

/**
 * Accelerometer samples. `hz`/`amp` give a coherent tremor, `driftAmp` a slow
 * sway, and `noiseAmp` broadband noise.
 *
 * `noiseAmp` matters: a truly steady hand is not silent, it is low-amplitude
 * BROADBAND noise. Modelling "steady" as a tiny pure sine would be unfair to
 * the detector, because band-power ratio is deliberately scale-invariant — a
 * pure tone reads as 100% in-band at any amplitude.
 *
 * NOTE: `t` is in milliseconds — resampleUniform() divides by 1000 internally.
 */
function motion(
  hz: number, amp: number, seconds = 8, sampleHz = 60, driftAmp = 0, noiseAmp = 0, seed = 7,
): MotionSample[] {
  const r = rnd(seed);
  const out: MotionSample[] = [];
  for (let i = 0; i < seconds * sampleHz; i++) {
    const t = i / sampleHz;
    const tremor = amp ? Math.sin(2 * Math.PI * hz * t) * amp : 0;
    const drift = driftAmp * Math.sin(2 * Math.PI * 0.08 * t); // very slow sway
    out.push({ t: t * 1000, mag: tremor + drift + noiseAmp * r() });
  }
  return out;
}

/** Tap timestamps (ms) at `hz`, with optional jitter and progressive slowing. */
function taps(hz: number, seconds: number, jitterMs = 0, slowPerTap = 0): number[] {
  const out: number[] = [];
  let t = 0;
  let gap = 1000 / hz;
  const n = Math.floor(seconds * hz);
  for (let i = 0; i < n; i++) {
    const j = jitterMs ? (Math.sin(i * 12.9898) * 43758.5453 % 1) * jitterMs : 0;
    out.push(t + j);
    gap += slowPerTap;
    t += gap;
  }
  return out;
}

const result = (test: TestResult['test'], subScore: number): TestResult => ({
  test, metrics: {}, subScore, timestamp: new Date().toISOString(),
});

// ============================================================ 1. FFT / band
section('1. การวัดความถี่การสั่น (FFT band-power)');
{
  const band = `${TREMOR_BAND.lo}–${TREMOR_BAND.hi} Hz`;

  // pure 5 Hz tremor -> nearly all power inside the parkinsonian band
  const pure = motion(5, 0.3);
  const uni = resampleUniform(pure.map((s) => s.t), pure.map((s) => s.mag), 60);
  const rPure = bandPowerRatio(uni, 60, TREMOR_BAND.lo, TREMOR_BAND.hi);
  check(`สั่น 5 Hz ล้วน → สัดส่วนพลังงานใน ${band}`, f(rPure), '> 0.80', rPure > 0.8);

  // 12 Hz is outside the band and must NOT be counted as parkinsonian tremor
  const fast = motion(12, 0.3);
  const uniF = resampleUniform(fast.map((s) => s.t), fast.map((s) => s.mag), 60);
  const rFast = bandPowerRatio(uniF, 60, TREMOR_BAND.lo, TREMOR_BAND.hi);
  check('สั่น 12 Hz (นอกย่าน) → ต้องไม่ถูกนับ', f(rFast), '< 0.10', rFast < 0.1);

  // slow drift only (arm sagging) must read as ~zero tremor
  const driftOnly = motion(0, 0, 8, 60, 2.5);
  const uniD = resampleUniform(driftOnly.map((s) => s.t), driftOnly.map((s) => s.mag), 60);
  const rDrift = bandPowerRatio(uniD, 60, TREMOR_BAND.lo, TREMOR_BAND.hi);
  check('แขนตกช้า ๆ อย่างเดียว (ไม่สั่น)', f(rDrift, 4), '< 0.05', rDrift < 0.05);

  // the hard case: a real 5 Hz tremor buried under drift 125x larger
  const buried = motion(5, 0.02, 8, 60, 2.5);
  const uniB = resampleUniform(buried.map((s) => s.t), buried.map((s) => s.mag), 60);
  const rBuried = bandPowerRatio(uniB, 60, TREMOR_BAND.lo, TREMOR_BAND.hi);
  check('สั่น 5 Hz ใต้ drift ใหญ่กว่า 125 เท่า', f(rBuried), '> 0.30', rBuried > 0.3);
}

// ==================================================== 2. tremor rest/postural
section('2. แยกสั่นขณะพัก vs ขณะยกค้าง');
{
  // parkinsonian pattern: tremor at REST, quiet when held up
  const pd = combineTremor(motion(5, 0.03), motion(5, 0.30));
  const pdScore = computeSubScore('tremor', pd as unknown as Record<string, number>, 70);
  check('รูปแบบพาร์กินสัน (สั่นตอนพัก)', pdScore, '> 60', pdScore > 60);

  // essential-tremor pattern: tremor when HELD UP, quiet at rest
  const et = combineTremor(motion(6, 0.30), motion(6, 0.03));
  const etScore = computeSubScore('tremor', et as unknown as Record<string, number>, 70);
  check('รูปแบบ Essential Tremor (สั่นตอนยก)', etScore, 'ต่ำกว่าแบบพาร์กินสัน', etScore < pdScore);

  // steady hands both phases
  const ok = combineTremor(motion(0, 0, 8, 60, 0, 0.02, 11), motion(0, 0, 8, 60, 0, 0.02, 23));
  const okScore = computeSubScore('tremor', ok as unknown as Record<string, number>, 70);
  check('มือนิ่งทั้งสองท่า', okScore, '< 25', okScore < 25);
}

// ============================================================== 3. tapping
section('3. การเคาะนิ้ว');
{
  // healthy: fast, even, no slowing, hands matched
  const tOk = taps(5.5, 10, 15);
  const healthy = combineTapping(tOk, tOk, tOk, 10);
  const sHealthy = computeSubScore('tapping', healthy as unknown as Record<string, number>, 70);
  check('เคาะเร็ว สม่ำเสมอ สองมือเท่ากัน', sHealthy, '< 30', sHealthy < 30);

  // bradykinesia: slow + progressive decrement
  const tSlow = taps(2.2, 10, 60, 3);
  const brady = combineTapping(tSlow, tSlow, tSlow, 10);
  const sBrady = computeSubScore('tapping', brady as unknown as Record<string, number>, 70);
  check('เคาะช้า + ช้าลงเรื่อย ๆ (สองมือเท่ากัน)', sBrady, '> 40', sBrady > 40);

  // slow on ONE side only — the pattern early Parkinson's actually shows
  const tFastB = taps(5.0, 10, 15);
  const bradyAsym = combineTapping(tFastB, tFastB, tSlow, 10);
  const sBradyAsym = computeSubScore('tapping', bradyAsym as unknown as Record<string, number>, 70);
  check('เคาะช้าข้างเดียว (แบบพาร์กินสันระยะแรก)', sBradyAsym, 'สูงกว่าแบบสองข้างเท่ากัน', sBradyAsym > sBrady);

  // asymmetry: one hand much slower — the early-Parkinson sign
  const fastHand = taps(5.0, 10, 15);
  const slowHand = taps(2.2, 10, 15);
  const asym = combineTapping(fastHand, fastHand, slowHand, 10);
  check('มือสองข้างต่างกันมาก → ค่า asymmetry', f(asym.asymmetry), '> 0.35', asym.asymmetry > 0.35);
  const matched = combineTapping(fastHand, fastHand, fastHand, 10);
  check('มือสองข้างเท่ากัน → asymmetry ≈ 0', f(matched.asymmetry), '< 0.05', matched.asymmetry < 0.05);
}

// ======================================================= 4. age adjustment
section('4. การปรับเกณฑ์ตามอายุ (ผลการเคาะเดียวกันทุกประการ)');
{
  const tSame = taps(3.6, 10, 45);
  const same = combineTapping(tSame, tSame, tSame, 10) as unknown as Record<string, number>;
  const a55 = computeSubScore('tapping', same, 55);
  const a70 = computeSubScore('tapping', same, 70);
  const a85 = computeSubScore('tapping', same, 85);
  check('อายุ 55 ปี', a55, 'สูงสุดในสามค่า', a55 > a70);
  check('อายุ 70 ปี', a70, 'กลาง', a70 > a85 && a70 < a55);
  check('อายุ 85 ปี', a85, 'ต่ำสุด (ผ่อนปรนตามวัย)', a85 < a70);
}

// ========================================================= 5. red flag rule
section('5. กฎ Red Flag (กันคะแนนเฉลี่ยกลบสัญญาณเดี่ยว)');
{
  // one severe test, four normal: the plain average says "low"
  const mixed = [result('tremor', 92), result('spiral', 12), result('tapping', 10),
                 result('facial', 8), result('voice', 6)];
  const overall = computeOverallScore(mixed);
  const plain = riskLevel(overall);
  const withFlag = overallRiskLevel(overall, mixed);
  check('คะแนนรวม (เฉลี่ยถ่วงน้ำหนัก)', overall, 'อยู่ในโซนเขียว', overall <= 33);
  check('ถ้าไม่มีกฎ red flag จะรายงานว่า', plain, 'low', plain === 'low');
  check('เมื่อมีกฎ red flag จะรายงานว่า', withFlag, 'ไม่ใช่ low', withFlag !== 'low');
}

// ============================================== 6. high-risk streak counting
section('6. การนับวันเสี่ยงสูงต่อเนื่อง');
{
  const day = (offset: number, score: number): Session => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return {
      id: 's' + offset, userType: 'general', results: [],
      overallScore: score, riskLevel: riskLevel(score), timestamp: d.toISOString(),
    };
  };
  // five consecutive high-risk days
  const streak5 = highRiskStreak([day(4, 80), day(3, 82), day(2, 79), day(1, 85), day(0, 88)]);
  check('เสี่ยงสูง 5 วันติดกัน', streak5, '= 5', streak5 === 5);

  // several sessions on the SAME day must count as one day, not many
  const sameDay = highRiskStreak([day(0, 80), day(0, 84), day(0, 88), day(0, 90)]);
  check('ทำ 4 รอบในวันเดียว', sameDay, '= 1 (ไม่นับซ้ำ)', sameDay === 1);

  // a normal day breaks the streak
  const broken = highRiskStreak([day(3, 88), day(2, 20), day(1, 85), day(0, 87)]);
  check('มีวันปกติคั่นกลาง → นับเฉพาะช่วงล่าสุด', broken, '= 2', broken === 2);
}

// ------------------------------------------------------------------ report
const line = '═'.repeat(96);
console.log('\n' + line);
console.log('NeuroMotion AI — ผลการตรวจสอบความถูกต้องเชิงเทคนิค (Technical Validation)');
console.log(line);
console.log(' ผล  │ รายการตรวจสอบ                                  │      ค่าที่วัด │ เกณฑ์ที่คาด');
console.log('─'.repeat(96));
console.log(rows.join('\n'));
console.log('─'.repeat(96));
console.log(` รวม: ${passed + failed} รายการ · ผ่าน ${passed} · ไม่ผ่าน ${failed}`);
console.log(line);
console.log('หมายเหตุ: ทุกค่าข้างต้นเป็นการตรวจสอบว่า "ระบบวัดได้ตรงตามที่ออกแบบไว้"');
console.log('          กับสัญญาณสังเคราะห์ที่เรากำหนดคำตอบไว้ล่วงหน้า');
console.log('          ไม่ใช่ค่าความไว/ความจำเพาะทางคลินิก ซึ่งต้องใช้ข้อมูลผู้ป่วยจริง\n');

// non-zero exit so CI (and `npm run validate`) fails loudly if a check breaks
if (failed > 0) (globalThis as { process?: { exit(c: number): void } }).process?.exit(1);
