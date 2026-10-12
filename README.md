<p align="center">
  <img src="public/pwa-192.png" alt="NeuroMotion AI logo" width="96" height="96">
</p>

<h1 align="center">NeuroMotion AI</h1>

A Thai-language PWA that gives a **preliminary screening** for neurological disease
risk — focused on Parkinson's — using five short phone-based tests. Built for the
**HIT Award 2026** pitch competition.

> ⚠️ **Not a diagnosis.** Results are a preliminary *risk indicator* only and do not
> replace a doctor. The scoring thresholds are engineering estimates, not clinically
> validated.

---

## What it does

You run five quick tests on your phone. Each produces raw signal → named metrics →
a 0–100 sub-score. The sub-scores combine into an overall risk level with a trend
graph over time, plus a differential indicator for *which of three tremor patterns*
the result most resembles.

| Test | What it measures | Sensor |
|------|------------------|--------|
| 🌀 **Spiral tracing** | Tracing error, 4–7 Hz tremor-band power, line-spacing & speed variation | Touch / pointer |
| 👆 **Finger tapping** | Rhythm, rate, bradykinesia slow-down, left/right asymmetry (MDS-UPDRS 3.4) | Touch timestamps |
| 🤚 **Rest tremor** | 4–7 Hz tremor power, postural + rest phases | Accelerometer (`DeviceMotionEvent`) |
| 🙂 **Head turn / face** | Yaw range, left/right symmetry | Camera + MediaPipe |
| 🗣️ **Voice** | Jitter, shimmer, pitch variation on a sustained "ahh" | Microphone |

**Privacy by design (Thai PDPA):** only the computed metric *numbers* are ever stored,
and only on your device (`localStorage`). Camera frames and audio are processed
in-memory and discarded — never uploaded, never saved.

---

## Try it

Scan the pitch QR code, or open the deployed link with `?demo` appended. Demo mode
seeds a fake profile and a week of sample data so you land on a populated dashboard
in a few seconds — a banner marks it as demo data the whole time.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # type-checks, then builds static files to dist/
npm run preview    # serve the production build locally
npm run validate   # ~21 synthetic-signal checks on the scoring math
```

> 📷 Camera / mic / motion need **HTTPS**. They work on `localhost` but **not** over a
> LAN IP — test those features from a deployed link.

## Deploy (free HTTPS)

- **Netlify Drop** — `npm run build`, then drag `dist/` onto <https://app.netlify.com/drop>. No git needed; `public/_redirects` handles routing.
- **Vercel** — connect the GitHub repo; it auto-detects Vite. `vercel.json` handles routing. Deploys on every push.

Optional: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`) to
serve tutorial videos from cloud storage. Without them the app falls back to its
built-in animated demos.

## Project layout

```
src/lib/      Pure calculation logic (no React) — one file per test, plus
              scoring.ts, conditions.ts, fft.ts, storage.ts.
              All tunable thresholds live in thresholds.ts.
src/routes/   Screens: Splash, Login, Consent (PDPA), Home, the 5 tests, Result,
              Settings, Admin, and /clinic (synthetic clinician dashboard).
src/lib/strings.ts   All Thai UI copy in one place.
design/       Original Claude Design handoff.
```

See **`CLAUDE.md`** for the full architecture, scoring pipeline, and the rules that
must never be violated (framing, PDPA, accessibility, threshold rationale).

## Tech

React 18 · TypeScript · Vite · Tailwind v4 · React Router · Recharts ·
MediaPipe Tasks Vision · PWA (installable, offline-capable).
