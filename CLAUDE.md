# CLAUDE.md — NeuroMotion AI (Web Demo)

This file is the project memory for Claude Code. Read it fully before writing code.

---

## 1. Project Overview

**NeuroMotion AI** is a web app (PWA) that provides **preliminary screening** for the
**risk** of neurological disease (focus: Parkinson's) using simple, phone-based tests.
The user traces a spiral, taps to a rhythm, holds the phone still, smiles at the camera,
and says "ahh". The app computes metrics from each test, produces sub-scores, and shows
an overall **risk level** with a progress graph over time.

**This is a competition demo.** Deadline-driven. Priorities: it must WORK on a real
phone via a shareable link, look polished, and be filmable. Ship a small, solid,
working slice rather than a large broken one.

**Target users:** elderly (60+), plus general users and patients. Accessibility first.

---

## 2. CRITICAL RULES (never violate)

1. **Framing:** This is a **"preliminary screening / risk indicator"**, NEVER a
   "diagnosis". All UI copy, result labels, and disclaimers must reflect this. Always
   include a short disclaimer on results: this does not replace a doctor's diagnosis.

2. **PDPA (Thai data-protection law):** Health + biometric data are *sensitive personal
   data*. Requirements baked into the app:
   - A consent screen with **two separate, unchecked checkboxes**:
     (a) store my results for screening (required to use the app),
     (b) OPTIONAL: use my **anonymized** data to improve the AI model.
   - Data used only for the purpose consented to.
   - For the demo, prefer storing only **computed metrics** (numbers), not raw
     video/audio. If raw face/voice is captured, process locally and discard; do not
     upload it.

3. **Accessibility (elderly-first):** Minimum 18px body text, 24px+ for key actions,
   tap targets ≥ 56px, high contrast, one primary action per screen, clear icon+label
   pairing, generous spacing. A global text-size toggle (A / A+ / A++) must work.

4. **Metrics are not clinically validated.** Thresholds below are reasonable engineering
   defaults derived from cited research, used to produce a *relative* risk indicator.
   Keep all thresholds in one config file so they're easy to tune. Never present output
   as medically confirmed.

---

## 3. Tech Stack

- **React 18 + Vite** (TypeScript)
- **Tailwind CSS** for styling (use design tokens in section 5)
- **React Router** for navigation between screens
- **Recharts** for result/progress graphs
- **HTML5 Canvas + Pointer Events** for the spiral & tapping tests
- **fft.js** (or a small FFT util) for frequency analysis
- **@mediapipe/tasks-vision** (Face Landmarker) for the smile test
- **Web Audio API** (getUserMedia + AnalyserNode) for the voice test
- **PWA:** vite-plugin-pwa for manifest + installability
- **Storage (demo):** localStorage or IndexedDB (idb-keyval). No backend required for
  the demo. Keep a storage abstraction so a real backend (Supabase/Firebase) can be
  swapped in later.

Do NOT introduce heavy state libraries. React state + context is enough.

---

## 4. Project Structure

```
src/
  main.tsx
  App.tsx                # router + providers
  routes/
    Splash.tsx
    Login.tsx            # two user types: general / patient
    Consent.tsx          # PDPA consent (two checkboxes)
    Home.tsx             # dashboard + daily quest + test tiles
    tests/
      SpiralTest.tsx
      TappingTest.tsx
      TremorTest.tsx
      FacialTest.tsx
      VoiceTest.tsx
    Result.tsx           # Result & Care screen
  lib/
    spiral.ts            # template generation + tracing metrics
    tapping.ts           # tap metrics
    tremor.ts            # accelerometer + FFT
    facial.ts            # mediapipe smile metrics
    voice.ts             # audio metrics
    fft.ts               # FFT helper
    scoring.ts           # normalize metrics -> sub-scores -> risk level
    thresholds.ts        # ALL tunable constants live here
    storage.ts           # save/load results (abstraction over localStorage)
    types.ts             # shared TypeScript types
  components/
    ui/                  # Button, Card, Badge, RiskGauge, TextSizeToggle, etc.
  context/
    SettingsContext.tsx  # text size, user type
  design/
    tokens.ts            # colors, spacing, font sizes (from Claude Design export)
```

---

## 5. Design System (tokens)

The approved Claude Design handoff bundle is imported at `design/reference/`.
**`design/reference/NeuroMotion Screens.dc.html`** is the primary file — read it in
full before implementing any screen, then recreate its visual output pixel-for-pixel
in React/Tailwind (don't copy its raw HTML/inline-style structure). It covers:
Splash, Login, Spiral test (ready + during-tracing), Finger Tapping, Facial scan,
Result & Care (normal + high-risk states), and Home dashboard (daily quest).
**Not yet designed:** Consent (PDPA), Rest Tremor, Voice — build those consistently
with the tokens below and section 2's accessibility rules.

The bundle also contains an **Admin/Clinical dashboard** (doctor-facing patient list,
high-risk case tracking, reports) — **out of scope for this demo.** Do not build it
unless explicitly asked; the build order in section 10 is patient-facing only.

Exact codes extracted from that export:

```
Colors:
  --primary (orange, main action):    #E8762C   hover/active: #D9681F
  --secondary (medical blue, trust):  #1B6CA8   hover/active: #155A8E
  --bg (patient-facing, warm):        #FFF9F2
  --bg (admin/clinical, neutral):     #F4F5F7
  --surface (cards):                  #FFFFFF
  --text (primary):                   #233A4D
  --text (muted):                     #8A97A3  (secondary muted: #5A6B7A)
  --border:                           #E8EAED
  --risk-low (green):                 #2E9E5B   text: #256B43   chip bg: #E9F5EC
  --risk-medium (amber):              #F1C232   text: #9C7A10   chip bg: #FBF3D9
  --risk-high (red):                  #D64545   text: #B23A3A   chip bg: #FBEAEA

Fonts:
  'Noto Sans Thai' (400/500/600/700/800) — all Thai body copy & UI labels
  'Nunito' (600/700/800/900)             — numerals, KPI/score figures, brand wordmark

Type scale (elderly-first patient screens, min sizes):
  body: 18px / headings: 24-32px / key actions: 24px+
  (the admin/clinical dashboard is for doctors, not elderly patients — it uses a
  denser scale there; don't force 18px+ body text onto it)

Radius: rounded-2xl (~14-24px) on cards & buttons. Soft shadows. Generous padding.
```

Status color (low/medium/high) must ALWAYS pair with a text label and/or icon —
never color alone.

---

## 6. The Tests — Metrics & Calculations

All tests output a `TestResult` with raw metrics + a 0–100 sub-score (higher = more
concerning) via `scoring.ts`. Keep thresholds in `thresholds.ts`.

### 6.1 Spiral Tracing (primary, build first)
- **Template:** Archimedean spiral `r = b·θ`, points
  `x = cx + b·θ·cos(θ)`, `y = cy + b·θ·sin(θ)`, θ from 0 to ~6π.
- **Capture** user points as `{x, y, t}` on pointer move.
- **Metrics:**
  - *Tracing error (RMS):* for each user point, convert to polar `(r_u, θ_u)` about
    center; compare `r_u` to template radius at `θ_u` (`b·θ_u`, accounting for winding).
    Compute RMS of the radial error.
  - *Tremor power (4–7 Hz):* build the radial-error-vs-time signal, resample to uniform
    dt, run FFT, sum spectral power in the 4–7 Hz band (Parkinsonian tremor band per
    cited research). Higher band power = higher concern.
  - *Spacing consistency:* ideal gap between consecutive turns = `2πb`. Measure actual
    inter-turn distances and take their coefficient of variation.
  - *Smoothness:* coefficient of variation of drawing speed (Δdistance/Δt).

### 6.2 Finger Tapping (build second)
- Present a target rhythm (e.g. metronome beat). Capture tap timestamps via
  `performance.now()`.
- **Metrics:**
  - *Rate:* taps per second.
  - *Rhythm variability:* std dev of inter-tap intervals (higher = more concern).
  - *Decrement (bradykinesia):* linear-fit slope of inter-tap interval over time
    (positive slope = slowing down = concern).
  - *Timing error (if rhythm-guided):* mean absolute error between actual tap times and
    target beat times.

### 6.3 Rest Tremor
- Use `DeviceMotionEvent` accelerometer for ~10s while phone is held still.
- **iOS:** must call `DeviceMotionEvent.requestPermission()` on a user tap.
- **Metric:** FFT on acceleration magnitude; power in 4–7 Hz band.
- Gracefully handle devices/browsers without motion sensors (skip + note).

### 6.4 Facial (smile)
- Use MediaPipe Face Landmarker on the camera stream. User holds a smile ~3s.
- **Metrics:** mouth-corner elevation amplitude, left/right symmetry, overall facial
  movement. Reduced expression (hypomimia) = concern.
- Process locally; do not upload frames.

### 6.5 Voice ("ahh")
- Web Audio: record ~5s sustained vowel. (Hardest — do last / optional.)
- **Metrics:** jitter (cycle-to-cycle F0 variation), shimmer (amplitude variation),
  F0 stability.

---

## 7. Scoring Model (`scoring.ts`)

- Normalize each raw metric to a 0–100 sub-score against reference ranges in
  `thresholds.ts` (clamp to [0,100]).
- Each test's sub-score = weighted combination of its metrics.
- Overall risk score = weighted average of available tests' sub-scores (only include
  tests actually completed).
- Map overall score to a **risk level**:
  `0–33 Low (green)`, `34–66 Medium (amber)`, `67–100 High (red)` (tunable).
- Persist each session's result with a timestamp so the progress graph can plot trend.

Keep all weights and cut points in `thresholds.ts` with comments citing the research
basis, and a clear note that they are provisional and need clinical calibration.

---

## 8. Data Model

```ts
type TestResult = {
  test: 'spiral' | 'tapping' | 'tremor' | 'facial' | 'voice';
  metrics: Record<string, number>;
  subScore: number;         // 0-100
  timestamp: string;        // ISO
};

type Session = {
  id: string;
  userType: 'general' | 'patient';
  results: TestResult[];
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  timestamp: string;
};
```

Store sessions via `storage.ts` (localStorage/IndexedDB). Never store names/IDs in a
way that ties to raw biometrics for the training-consent path — anonymize.

---

## 9. Coding Conventions

- TypeScript, functional components, hooks. Small, focused files.
- All UI text in a central place so Thai/English strings are easy to manage; app UI
  copy is **Thai** (users are Thai elderly). Keep code identifiers in English.
- Pure calculation functions in `lib/` (no React) so they're testable and portable to
  Flutter later. Add a few unit tests for `spiral.ts`, `tapping.ts`, `scoring.ts`.
- Handle permission failures (camera/mic/motion) gracefully with clear messages.
- Mobile-first responsive layouts. Test at ~390px width.
- Comment the math in each `lib` file.

---

## 10. Build Order (roadmap)

Ship each step working before moving on:
1. Project scaffold (Vite + React + TS + Tailwind + Router + PWA) + design tokens + UI kit.
2. **Spiral test** end-to-end: template render, capture, metrics, sub-score, result view.
3. **Tapping test** end-to-end.
4. **Result & Care** screen with per-test breakdown + progress graph (Recharts).
5. Splash + Login (two types) + **Consent (PDPA)** + Home/daily-quest flow.
6. Rest Tremor (with iOS motion permission).
7. Facial (MediaPipe) — then Voice (optional, if time remains).
8. PWA polish (manifest, icons, add-to-home-screen), deploy.

---

## 11. Deployment

- Git repo + deploy to **Vercel** or **Netlify** (free). HTTPS is automatic and REQUIRED
  for camera/mic/motion.
- Verify on a real phone: spiral drawing smoothness, button sizes, permissions, graphs.
- The goal artifact is a **shareable link** judges can open on their own phones.

---

## 12. Future (post-demo, do NOT build now)

- Swap localStorage for Supabase/Firebase (keep `storage.ts` abstraction).
- Android app via Flutter, reusing the exact metric/scoring logic from `lib/`.
- Collect consented, anonymized data to train an ML model (the "data flywheel").
- Path toward Software-as-a-Medical-Device registration.
