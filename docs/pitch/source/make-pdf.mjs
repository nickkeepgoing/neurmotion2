/**
 * Render one of the pitch documents in this folder to a print-ready PDF.
 *
 *   node docs/pitch/source/make-pdf.mjs <source.html> <out.pdf>
 *
 * These documents are written as Artifact fragments — no <html>/<head>/<body>,
 * because the Artifact host supplies those — so they need wrapping before a
 * browser will render them as a standalone file with the right charset.
 *
 * The Q&A sections are collapsed <details>. Printed untouched, every answer
 * would be missing and the PDF would be a list of questions, so they are forced
 * open here rather than in the source (where collapsing is what makes the page
 * scannable on a phone).
 *
 * Uses headless Chrome instead of a PDF library because these pages depend on
 * Google Fonts for Thai text and on CSS the layout is actually built with.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const [, , srcArg, outArg] = process.argv;
if (!srcArg || !outArg) {
  console.error('usage: node make-pdf.mjs <source.html> <out.pdf>');
  process.exit(1);
}

const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error('No Chrome/Edge found. Checked:\n  ' + CHROME_CANDIDATES.join('\n  '));
  process.exit(1);
}

const srcPath = resolve(srcArg);
const outPath = resolve(outArg);
const tmpPath = resolve(tmpdir(), 'nm-pitch-print.html');

let body = readFileSync(srcPath, 'utf8');

// the fragment's <title> belongs in the document head
const title = body.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? 'NeuroMotion';
body = body.replace(/<title>[\s\S]*?<\/title>/, '');

// expand every Q&A block
body = body.replace(/<details(?![^>]*\bopen\b)/g, '<details open');

// the font <link> has to sit in <head> to be fetched before first paint
const fontLink = body.match(/<link[\s\S]*?>/)?.[0] ?? '';
body = body.replace(/<link[\s\S]*?>/, '');

const printCss = `
  @page { size: A4; margin: 14mm 12mm; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { background: #FFF9F2; }
  .page { max-width: none; padding: 0; gap: 2.2rem; }
  nav { display: none; }
  .sec-head { break-after: avoid; }
  .beat, .tcard, details, .slide-row, .phase, .callout { break-inside: avoid; }
  summary { cursor: default; }
  a { color: inherit; text-decoration: none; }
`;

writeFileSync(
  tmpPath,
  `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>*,*::before,*::after{box-sizing:border-box}body{margin:0}</style>
${fontLink}
</head>
<body>
${body}
<style>${printCss}</style>
</body>
</html>`,
  'utf8'
);

mkdirSync(dirname(outPath), { recursive: true });
execFileSync(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-pdf-header-footer',
    '--virtual-time-budget=20000', // wait for the webfont request to finish
    `--print-to-pdf=${outPath}`,
    `file:///${tmpPath.replace(/\\/g, '/')}`,
  ],
  { stdio: 'inherit' }
);

console.log('wrote', outPath);
