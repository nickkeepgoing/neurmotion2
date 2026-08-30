# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NeuroMotion AI** is a Thai-language PWA that provides **preliminary screening** for
neurological disease risk (focus: Parkinson's) via five phone-based tests: spiral
tracing, finger tapping, rest tremor, head-turn (facial), and sustained-vowel voice.
Each test yields raw metrics → a 0–100 sub-score → an overall risk level with a
trend graph over time, plus a differential "which of three tremor patterns does this
resemble" indicator.

Built for the **HIT Award 2026** pitch competition. Judges reach the live app by
scanning a QR code and land on `?demo` (see Demo mode below) rather than the normal
onboarding flow.

**Target users:** Thai elderly (60+), general users, and patients. Accessibility-first
on every patient-facing screen (see Critical Rules).

## Critical Rules (never violate)

1. **Framing:** "preliminary screening / risk indicator", **never** "diagnosis". Every
   result screen must carry a disclaimer that this does not replace a doctor.
2. **PDPA (Thai data-protection law):** health + biometric data is sensitive personal
   data.
   - Consent screen has **two separate, unchecked checkboxes**: (a) store my results
     — required, (b) optional anonymized use for model improvement.
   - Only **computed metric numbers** are ever persisted. Camera frames and audio are
     processed in-memory and discarded — never uploaded, never stored as blobs.
   - The clinician view (`/clinic`, see Architecture) reinforces this: it is
     intentionally built on a synthetic cohort, never real patient data, and is
     outside the patient consent gate for exactly that reason.
3. **Accessibility (elderly-first, patient screens only):** 18px+ body text, 56px+ tap
   targets, one primary action per screen, icon+label pairing (never a bare icon),
   color always paired with a text label. The A/A+/A++ text-size toggle scales the
   whole app via a `data-textscale` attribute (see Design tokens). `/clinic` is the
   one screen exempt from this scale — see Architecture.
4. **Metrics are engineering estimates, not clinically validated.** Every cut point,
   weight, and age adjustment lives in `src/lib/thresholds.ts` with a comment citing
   its rationale. `npm run validate` proves the *signal processing* is internally
   consistent (a synthetic 5 Hz tremor really measures as 5 Hz); it is not a
   sensitivity/specificity claim, and no UI or doc should present it as one.

## Commands

```bash
npm run dev        # Vite dev server
npm run build       # tsc -b && vite build — type-checks before bundling
npm run preview     # serve the production build locally
npm run validate    # runs src/lib/validation.test.ts — see below
```

There is no lint script and no Vitest/Jest — `npm run validate` is a **single
hand-rolled script**, not a test framework: it runs ~21 checks against synthetic
signals with known ground truth (e.g. a generated 5 Hz tremor should score >0.8 band
power) and prints a pass/fail table, exiting 1 on any failure. There is no per-test
filter flag; to isolate one check during debugging, comment out the others in
`validation.test.ts` (it's plain sequential code, not describe/it blocks).

## Architecture

### Consent gate, demo mode, and staff-only routes (`src/App.tsx`)

Patient-facing routes (`/home`, `/test/*`, `/result`, `/settings`, `/admin`) sit behind
`RequireConsent`, which redirects to `/consent` unless `settings.consented`. `/clinic`
is **deliberately outside that gate** — it renders only synthetic demo-cohort data
(`src/lib/clinicDemo.ts`), so it holds nothing a patient consented to.

`?demo` in the URL (handled by `src/lib/demoMode.ts` + `DemoEntry` in `App.tsx`) writes
a fixed fake profile straight to `localStorage`, seeds a week of sample sessions, and
navigates to `/home` — skipping the birth-date picker and consent screen entirely so a
judge scanning the QR code lands on a populated dashboard in under 3 seconds instead of
filling in a form. A dismissible `DemoBanner` stays visible for the rest of that session
so demo data is never mistaken for a real result.

### Scoring pipeline (multi-file: thresholds → scoring → conditions → storage)

Each test's route (`src/routes/tests/*Test.tsx`) collects raw signal (pointer moves,
tap timestamps, `DeviceMotionEvent`, MediaPipe landmarks, or an audio buffer), converts
it to named metrics via the matching `src/lib/{spiral,tapping,tremor,facial,voice}.ts`,
then calls `computeSubScore()` (`src/lib/scoring.ts`), which:

1. Looks up each metric's `{good, bad, weight}` range in `METRIC_RANGES`
   (`src/lib/thresholds.ts`).
2. Shifts that range per `ageAdjustedRange()` — normal motor slowing with age would
   otherwise over-flag older users; the shift is keyed by test+metric in `AGE_SHIFT`.
3. Normalizes to 0–100 and takes the weighted mean → the test's sub-score.

`computeOverallScore()` combines completed tests' sub-scores by `TEST_WEIGHTS`, and
`overallRiskLevel()` applies a **red-flag override**: `redFlagTests()` finds any single
test scoring ≥ `RED_FLAG_SUBSCORE` (80) and prevents the overall level from being
averaged down to "low" — one severely abnormal domain can't be diluted by four normal
ones.

`src/lib/conditions.ts` runs the **same** `METRIC_RANGES`/`ageAdjustedRange` machinery
through a second, differential lens — reusing per-metric normalized features to score
three tremor-pattern hypotheses (Parkinsonian / essential / enhanced physiological)
rather than a single risk number. This is a pattern-similarity indicator, not a
diagnosis; see the comment at the top of that file for the clinical distinctions it
encodes.

`src/lib/storage.ts` persists one `Session` per calendar day to `localStorage`
(re-testing a test the same day replaces that test's result, not the whole session).
`highRiskStreak()` walks *local calendar days* backward from today — sessions merely
being chronologically close doesn't count as a streak if a day was skipped.

### Tutorial videos: three-tier fallback (`supabase.ts` + `videos.ts` + `TestIntro.tsx`)

Every test's "watch how" step tries, in order: (1) Supabase Storage public bucket
`tutorials` — one admin upload, visible on every device including a judge's own phone;
(2) this device's local IndexedDB copy — an offline fallback if the venue's network
drops mid-pitch; (3) neither — falls back to the built-in animated demo
(`TestDemo.tsx`), which was always the default before cloud upload existed. The whole
chain lives in `getVideoUrl()` in `videos.ts`; `TestIntro.tsx` doesn't know or care
which tier resolved.

`lib/supabase.ts` talks to Storage's REST API directly with plain `fetch` — no
`@supabase/supabase-js` dependency. Requires `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` in `.env.local` (copy from `.env.example`); without them
`isSupabaseConfigured()` is false and the app silently runs tiers 2–3 only. The anon
key is meant to be public (it ships in the JS bundle regardless); **`docs/supabase-storage-policy.sql`
grants that key insert/update/delete on the `tutorials` bucket only** — necessary
because there is no admin auth yet. Re-run it if the bucket is ever recreated.

Large uploads are compressed client-side (canvas + `MediaRecorder`, see
`compressVideoIfNeeded` in `videos.ts`) before hitting Storage's per-file size limit.

### Design tokens (`src/index.css`, not a TS file)

Colors, elevation, and radius are Tailwind v4 `@theme` custom properties in
`src/index.css` — there is no `design/tokens.ts`. The values were extracted from the
Claude Design handoff at `design/reference/NeuroMotion Screens.dc.html`; read that file
before touching visual styling on a screen it covers. Risk-level tokens are named
`risk-low` / `risk-med` / `risk-high` (not `risk-medium`). Text-size scaling is a root
`font-size` swap driven by `html[data-textscale]`, set in `SettingsContext.tsx` — it
rescales every `rem`-based Tailwind class app-wide, so patient screens should stay in
`rem`-derived utilities rather than fixed `px`.

The `/clinic` clinician view (`src/routes/Clinic.tsx`) is the **one screen exempt**
from the 18px/56px elderly-first scale — it's for staff on a desktop, using the denser
scale the original design handoff specifies for the clinical dashboard.

## The Five Tests — Metrics

All thresholds, weights, and band definitions live in `src/lib/thresholds.ts`.

- **Spiral tracing** (`spiral.ts`, weight 0.30) — Archimedean template `r = b·θ`;
  radial tracing error (RMS), 4–7 Hz tremor-band power on the error-vs-time signal
  (custom radix-2 FFT in `fft.ts`, Hann-windowed + detrended), inter-turn spacing CV,
  drawing-speed CV.
- **Finger tapping** (`tapping.ts`, weight 0.25) — MDS-UPDRS 3.4 structure: paced block
  (rhythm CV, timing error vs. beat) + two unpaced maximal blocks, one per hand (rate,
  bradykinesia decrement slope, left/right asymmetry).
- **Rest tremor** (`tremor.ts`, weight 0.20) — `DeviceMotionEvent` accelerometer, two
  phases (postural + rest-supported), 4–7 Hz band power per phase. iOS requires
  `DeviceMotionEvent.requestPermission()` behind a tap.
  `MIN_VALID`/`FACIAL`/`VOICE` gates in `thresholds.ts` reject a session with too little
  signal rather than scoring noise as "perfect".
- **Head turn / facial** (`facial.ts`, weight 0.15) — MediaPipe Face Landmarker, camera
  frames processed locally and discarded; yaw range + left/right symmetry.
- **Voice** (`voice.ts`, weight 0.10) — ~5s sustained vowel via Web Audio; jitter,
  shimmer, F0 CV. A live loudness meter (`LoudnessMeter.tsx`) guides recording level but
  is **not** scored — browsers expose no calibrated SPL.

## Coding Conventions

- All Thai UI copy lives in `src/lib/strings.ts` (`S.*`) — never inline a string in a
  component. Code identifiers stay in English.
- Calculation logic in `src/lib/` is pure (no React), so it's independently testable —
  see `validation.test.ts`'s synthetic-signal approach when adding a new metric.
- Mobile-first at ~390px; `/clinic` is the exception (desktop-first, responsive down).

## Deployment

- `vercel.json` handles SPA routing; push to the connected repo to deploy (Vercel
  auto-detects the Vite build). Netlify Drop (`dist/` → app.netlify.com/drop) is the
  no-git fallback — `public/_redirects` covers SPA routing there too.
- HTTPS is required for camera/mic/motion permissions — these only work on `localhost`
  or a deployed HTTPS link, never over a LAN IP in dev.
- Remember to configure `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` as environment
  variables on the deploy target, or tutorial videos silently fall back to tier 2/3.

## Future Work (do not build unless asked)

- Real backend + auth for session data itself (currently `localStorage` only, per
  device — Supabase is wired up so far only for tutorial video storage).
- Clinical validation study to replace the engineering-estimate thresholds; only after
  that should `/clinic` (or any dashboard) be connected to real patient data.
- micrographia and hypomimia measurement (not currently captured).
- Android app via Flutter, reusing the `src/lib/` calculation logic.
