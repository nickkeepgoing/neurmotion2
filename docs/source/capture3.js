const puppeteer = require('puppeteer-core');
const path = require('path');
const OUT = path.join(__dirname, 'shots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new', args: ['--disable-gpu', '--hide-scrollbars'],
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  });
  const p = await b.newPage();
  await p.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  for (const [url, y, name] of [
    ['/register', 0, '03a-register-top'],
    ['/register', 700, '03b-register-more'],
  ]) {
    await p.goto('http://localhost:3000' + url, { waitUntil: 'networkidle2' });
    await sleep(900); await p.evaluate((yy) => window.scrollTo(0, yy), y); await sleep(600);
    await p.screenshot({ path: path.join(OUT, name + '.png') }); console.log('  ✓', name);
  }
  // consent needs the login step first to carry the profile
  await p.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await sleep(900);
  await p.evaluate(() => { const el=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('เริ่มต้นใช้งาน')); el && el.click(); });
  await sleep(1200);
  for (const [y, name] of [[0, '04a-consent-top'], [600, '04b-consent-more']]) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y); await sleep(600);
    await p.screenshot({ path: path.join(OUT, name + '.png') }); console.log('  ✓', name);
  }
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
