/**
 * Walks every screen of NeuroMotion AI and saves a screenshot of each.
 *
 * Uses the real Chrome with fake camera/mic devices so the facial and voice
 * tests actually run, and injects synthetic DeviceMotion events so the tremor
 * test progresses. Screenshots are taken at a true 390px phone viewport.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:3000';
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
const log = (...a) => console.log(...a);

async function shot(page, name, opts = {}) {
  await sleep(opts.settle ?? 450);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: !!opts.full });
  n++;
  log(`  ✓ ${name}${opts.full ? ' (full)' : ''}`);
}

/** Click the first visible element whose trimmed text contains `text`. */
async function clickText(page, text, sel = 'button, a') {
  const ok = await page.evaluate((t, s) => {
    const els = [...document.querySelectorAll(s)];
    const el = els.find((e) => e.offsetParent !== null && e.textContent.replace(/\s+/g, ' ').trim().includes(t));
    if (!el) return false;
    el.click();
    return true;
  }, text, sel);
  if (!ok) throw new Error(`clickText: not found "${text}"`);
  await sleep(500);
  return ok;
}

async function tryClickText(page, text, sel = 'button, a') {
  try { return await clickText(page, text, sel); } catch { return false; }
}

/** Seed a signed-in user with a week of history. */
async function seed(page) {
  await page.goto(`${BASE}/home`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.setItem('nm.settings', JSON.stringify({
      consented: true, consentTraining: false, userType: 'general',
      displayName: 'สมชาย ใจดี', age: 72, birthDate: '1954-03-12',
      textScale: 0, voiceOn: false,
    }));
  });
  const mod = await page.evaluate(async () => {
    const st = await import('/src/lib/storage.ts');
    st.seedSampleData();
    return true;
  });
  return mod;
}

/** Feed synthetic accelerometer data so the tremor test can run headless. */
async function startFakeMotion(page, { tremorHz = 5.5, amp = 0.35 } = {}) {
  await page.evaluate((hz, a) => {
    if (window.__motionTimer) clearInterval(window.__motionTimer);
    let t = 0;
    window.__motionTimer = setInterval(() => {
      t += 1 / 60;
      const s = Math.sin(2 * Math.PI * hz * t) * a;
      const ev = new Event('devicemotion');
      Object.defineProperties(ev, {
        acceleration: { value: { x: s, y: s * 0.6, z: s * 0.3 } },
        accelerationIncludingGravity: { value: { x: s, y: s * 0.6, z: 9.8 + s * 0.3 } },
        rotationRate: { value: { alpha: 0, beta: 0, gamma: 0 } },
        interval: { value: 16 },
      });
      window.dispatchEvent(ev);
    }, 16);
  }, tremorHz, amp);
}
async function stopFakeMotion(page) {
  await page.evaluate(() => { if (window.__motionTimer) clearInterval(window.__motionTimer); });
}

/** Drag along the spiral template so the tracing test produces a real drawing. */
async function traceSpiral(page, turns = 5.4, pauseAt = null, onPause = null) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!box) throw new Error('no spiral canvas');
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const maxR = (Math.min(box.w, box.h) / 2) * 0.86;
  const TH = turns * 2 * Math.PI;
  const steps = 260;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    const th = (i / steps) * TH;
    const r = (th / TH) * maxR;
    // small wobble so the trace looks human rather than machine-perfect
    const w = Math.sin(th * 6) * 1.6;
    await page.mouse.move(cx + (r + w) * Math.cos(th), cy + (r + w) * Math.sin(th));
    // let the caller grab a frame mid-drag: once the pointer lifts, the test
    // scores itself and the drawn line is gone from the screen
    if (pauseAt && onPause && i === Math.round(steps * pauseAt)) await onPause();
  }
  await page.mouse.up();
}

/** Tap the big circle button on a cadence. */
async function tapButton(page, count, gapMs) {
  const box = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    // the tap target is the largest round button on screen
    let best = null, bestA = 0;
    for (const b of btns) {
      const r = b.getBoundingClientRect();
      const a = r.width * r.height;
      if (r.width > 120 && a > bestA) { bestA = a; best = r; }
    }
    return best ? { x: best.x + best.width / 2, y: best.y + best.height / 2 } : null;
  });
  if (!box) return false;
  for (let i = 0; i < count; i++) {
    await page.mouse.click(box.x, box.y);
    await sleep(gapMs);
  }
  return true;
}

/**
 * Cover the camera preview before screenshotting.
 *
 * The fake capture device renders Chrome's green test pattern, which would look
 * broken in a document — and putting a real person's face into a health
 * screening manual is not something to do casually. A labelled placeholder is
 * honest and keeps the surrounding UI (turn guides, chips, privacy notice)
 * fully visible, which is what the illustration is actually for.
 */
async function maskCamera(page) {
  await page.evaluate(() => {
    document.querySelectorAll('video').forEach((v) => {
      if (v.dataset.masked) return;
      v.dataset.masked = '1';
      const r = v.getBoundingClientRect();
      const host = v.parentElement;
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
      const box = document.createElement('div');
      box.style.cssText = [
        'position:absolute',
        'left:' + v.offsetLeft + 'px',
        'top:' + v.offsetTop + 'px',
        'width:' + r.width + 'px',
        'height:' + r.height + 'px',
        'background:linear-gradient(160deg,#E7EDF2,#D2DDE6)',
        'border-radius:' + (getComputedStyle(v).borderRadius || '18px'),
        'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px',
        'z-index:5;padding:0 18px;text-align:center',
        "font-family:'Noto Sans Thai',sans-serif",
        'color:#5A6B7A;font-size:15px;font-weight:700;line-height:1.5',
      ].join(';');
      const svg =
        '<svg width="52" height="52" viewBox="0 0 24 24" fill="none">' +
        '<circle cx="12" cy="9" r="4" stroke="#8A97A3" stroke-width="1.8"/>' +
        '<path d="M4 20c0-3.3 3.6-5.5 8-5.5s8 2.2 8 5.5" stroke="#8A97A3" stroke-width="1.8" stroke-linecap="round"/>' +
        '</svg>';
      box.innerHTML = svg + '<span>ภาพจากกล้องของผู้ใช้<br>(ปิดทับเพื่อความเป็นส่วนตัว)</span>';
      host.appendChild(box);
    });
  });
  await sleep(140);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: [
      '--use-fake-ui-for-media-stream',      // auto-grant camera/mic
      '--use-fake-device-for-media-stream',  // synthetic video + audio
      `--use-file-for-fake-audio-capture=${path.join(__dirname, 'voice.wav')}`,
      '--autoplay-policy=no-user-gesture-required',
      '--allow-file-access-from-files',
      '--disable-gpu',
      '--hide-scrollbars',
    ],
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  });

  const ctx = browser.defaultBrowserContext();
  await ctx.overridePermissions(BASE, ['camera', 'microphone']);

  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', (e) => log('  ! page error:', String(e).slice(0, 120)));

  // ---------- onboarding (fresh, unconsented) ----------
  log('\n[onboarding]');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
  await shot(page, '00-splash', { settle: 900 });

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await shot(page, '01-login');

  await tryClickText(page, 'ขนาดตัวอักษร');
  await shot(page, '02-login-textsize');
  await page.keyboard.press('Escape');
  await sleep(300);

  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle2' });
  await shot(page, '03-register', { full: true });

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await tryClickText(page, 'เริ่มต้นใช้งาน');
  await sleep(700);
  await shot(page, '04-consent', { full: true });

  // ---------- seeded main screens ----------
  log('\n[main screens]');
  await seed(page);
  await page.goto(`${BASE}/home`, { waitUntil: 'networkidle2' });
  await shot(page, '05-home');
  await shot(page, '06-home-full', { full: true });

  await tryClickText(page, 'ดูปฏิทิน');
  await shot(page, '07-calendar');
  await page.keyboard.press('Escape');
  await sleep(300);

  await page.goto(`${BASE}/result`, { waitUntil: 'networkidle2' });
  await shot(page, '08-result');
  await shot(page, '09-result-full', { full: true });

  await tryClickText(page, 'ปรึกษาแพทย์');
  await shot(page, '10-result-consult');
  await page.keyboard.press('Escape');
  await sleep(300);

  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle2' });
  await shot(page, '11-settings', { full: true });

  // ================= TEST FLOWS =================
  // Each: step1 watch → step2 practice → countdown → running → done

  // ---------- 1. SPIRAL ----------
  log('\n[spiral]');
  await page.goto(`${BASE}/test/spiral`, { waitUntil: 'networkidle2' });
  await shot(page, '20-spiral-1-watch', { settle: 1200 });
  await clickText(page, 'ต่อไป: ทดลองใช้');
  await shot(page, '21-spiral-2-practice', { settle: 900 });
  await traceSpiral(page, 2.2);
  await shot(page, '22-spiral-2-practice-drawn');
  await clickText(page, 'พร้อมแล้ว ทดสอบจริง');
  await shot(page, '23-spiral-3-countdown', { settle: 700 });
  await sleep(3400);
  await shot(page, '24-spiral-4-tracing-empty', { settle: 200 });
  await traceSpiral(page, 5.4, 0.55, async () => {
    await shot(page, '25-spiral-5-tracing-live', { settle: 250 });
  });
  await sleep(2600);
  await shot(page, '26-spiral-6-done', { settle: 600, full: true });

  // ---------- 2. TAPPING ----------
  log('\n[tapping]');
  await page.goto(`${BASE}/test/tapping`, { waitUntil: 'networkidle2' });
  await shot(page, '30-tapping-1-watch', { settle: 1200 });
  await clickText(page, 'ต่อไป: ทดลองใช้');
  await shot(page, '31-tapping-2-practice', { settle: 900 });
  await tapButton(page, 5, 420);
  await shot(page, '32-tapping-2-practice-tapped');
  await clickText(page, 'พร้อมแล้ว ทดสอบจริง');
  await shot(page, '33-tapping-3-countdown', { settle: 700 });
  await sleep(3400);
  await shot(page, '34-tapping-4-running', { settle: 200 });
  await tapButton(page, 16, 480);
  await shot(page, '35-tapping-5-midway');
  // ride out the remaining blocks
  for (let i = 0; i < 3; i++) {
    await sleep(2500);
    await tryClickText(page, 'เริ่ม');
    await tapButton(page, 14, 300);
  }
  await sleep(2500);
  await shot(page, '36-tapping-6-after', { settle: 700, full: true });

  // ---------- 3. TREMOR ----------
  log('\n[tremor]');
  await page.goto(`${BASE}/test/tremor`, { waitUntil: 'networkidle2' });
  await startFakeMotion(page);
  await shot(page, '40-tremor-1-watch', { settle: 1200 });
  await clickText(page, 'ต่อไป: ทดลองใช้');
  await shot(page, '41-tremor-2-practice', { settle: 1400 });
  await tryClickText(page, 'พร้อมแล้ว ทดสอบจริง');
  await shot(page, '42-tremor-3-countdown', { settle: 700 });
  await sleep(3400);
  await shot(page, '43-tremor-4-postural', { settle: 900 });
  await sleep(8000);
  await shot(page, '44-tremor-5-switch', { settle: 600 });
  await tryClickText(page, 'พร้อม');
  await sleep(3400);
  await shot(page, '45-tremor-6-rest', { settle: 900 });
  await sleep(9000);
  await shot(page, '46-tremor-7-done', { settle: 800, full: true });
  await stopFakeMotion(page);

  // ---------- 4. FACIAL ----------
  log('\n[facial]');
  await page.goto(`${BASE}/test/facial`, { waitUntil: 'networkidle2' });
  await maskCamera(page);
  await shot(page, '50-facial-1-watch', { settle: 1400 });
  await clickText(page, 'ต่อไป: ทดลองใช้');
  await maskCamera(page);
  await shot(page, '51-facial-2-practice', { settle: 3000 });
  await tryClickText(page, 'พร้อมแล้ว ทดสอบจริง');
  await maskCamera(page);
  await shot(page, '52-facial-3-loading', { settle: 900 });
  await sleep(3600);
  await maskCamera(page);
  await shot(page, '53-facial-4-scanning', { settle: 900 });
  await sleep(6000);
  await maskCamera(page);
  await shot(page, '54-facial-5-later', { settle: 600, full: true });

  // ---------- 5. VOICE ----------
  log('\n[voice]');
  await page.goto(`${BASE}/test/voice`, { waitUntil: 'networkidle2' });
  await shot(page, '60-voice-1-watch', { settle: 1400 });
  await clickText(page, 'ต่อไป: ทดลองใช้');
  await shot(page, '61-voice-2-practice', { settle: 2500 });
  await tryClickText(page, 'พร้อมแล้ว ทดสอบจริง');
  await shot(page, '62-voice-3-countdown', { settle: 700 });
  await sleep(3400);
  await shot(page, '63-voice-4-recording', { settle: 1200 });
  await sleep(2000);
  await shot(page, '64-voice-5-recording2', { settle: 400 });
  await sleep(4000);
  await shot(page, '65-voice-6-after', { settle: 800, full: true });

  log(`\nDONE — ${n} screenshots in ${OUT}`);
  await browser.close();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
