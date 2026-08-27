/**
 * Supplementary capture: scrolled views of the long screens.
 *
 * A fullPage screenshot of /result is 780x5584 — a 7:1 strip that is unreadable
 * at any width that fits a page, and it forces neighbouring images to stretch.
 * Capturing the same content as a sequence of normal phone-shaped viewports
 * keeps every frame legible and all frames the same aspect ratio.
 */
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:3000';
const OUT = path.join(__dirname, 'shots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--disable-gpu', '--hide-scrollbars'],
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  });
  const page = await browser.newPage();

  await page.goto(`${BASE}/home`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    localStorage.setItem('nm.settings', JSON.stringify({
      consented: true, consentTraining: false, userType: 'general',
      displayName: 'สมชาย ใจดี', age: 72, birthDate: '1954-03-12', textScale: 0, voiceOn: false,
    }));
  });
  await page.evaluate(async () => { (await import('/src/lib/storage.ts')).seedSampleData(); });

  /** Screenshot `path` at a set of scroll offsets. */
  async function scrolls(urlPath, items) {
    await page.goto(BASE + urlPath, { waitUntil: 'networkidle2' });
    await sleep(1400);
    for (const [y, name] of items) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await sleep(700);
      await page.screenshot({ path: path.join(OUT, name + '.png') });
      console.log('  ✓', name, '(scroll ' + y + ')');
    }
  }

  console.log('[result]');
  await scrolls('/result', [
    [0, '08a-result-top'],
    [560, '08b-result-conditions'],
    [1180, '08c-result-tests'],
    [1780, '08d-result-trend'],
    [2500, '08e-result-care'],
  ]);

  console.log('[home]');
  await scrolls('/home', [
    [0, '05a-home-top'],
    [620, '05b-home-tests'],
    [1200, '05c-home-week'],
  ]);

  console.log('[settings]');
  await scrolls('/settings', [
    [0, '11a-settings-top'],
    [560, '11b-settings-more'],
  ]);

  await browser.close();
  console.log('done');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
