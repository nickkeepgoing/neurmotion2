import { useEffect, useRef, useState } from 'react';
import Countdown from '../../components/Countdown';
import PermissionDenied from '../../components/PermissionDenied';
import TestDone from '../../components/TestDone';
import TestIntro from '../../components/TestIntro';
import TestInvalid from '../../components/TestInvalid';
import TestShell from '../../components/TestShell';
import { ShieldIcon } from '../../components/icons';
import { useSettings } from '../../context/SettingsContext';
import { computeFacialMetrics, computeYawDeg, type FaceFrame } from '../../lib/facial';
import { computeSubScore } from '../../lib/scoring';
import { speak } from '../../lib/speech';
import { saveTestResult } from '../../lib/storage';
import { S } from '../../lib/strings';
import { FACIAL, MIN_VALID } from '../../lib/thresholds';

type Phase = 'intro' | 'loading' | 'countdown' | 'scanning' | 'done' | 'error' | 'invalid';

/**
 * Head-turn test (cranial-nerve style): the user turns their head fully left
 * then right. MediaPipe Face Landmarker runs in-browser; frames never leave the
 * device (PDPA) — only the yaw angles are kept.
 */
export default function FacialTest() {
  const { settings } = useSettings();
  const [phase, setPhase] = useState<Phase>('intro');
  const [prompt, setPrompt] = useState(S.headTurn.lookCenter);
  const [leftDone, setLeftDone] = useState(false);
  const [rightDone, setRightDone] = useState(false);
  const [subScore, setSubScore] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<FaceFrame[]>([]);
  const centerRef = useRef<number | null>(null);
  const leftRef = useRef(false);
  const rightRef = useRef(false);
  const stopRef = useRef<() => void>(() => {});
  const beginScanRef = useRef<() => void>(() => {});
  const finishedRef = useRef(false);
  const spokenRef = useRef({ left: false, right: false });

  useEffect(() => () => stopRef.current(), []);

  const start = async () => {
    setPhase('loading');
    finishedRef.current = false;
    framesRef.current = [];
    centerRef.current = null;
    leftRef.current = false;
    rightRef.current = false;
    spokenRef.current = { left: false, right: false };
    setLeftDone(false);
    setRightDone(false);
    try {
      const [{ FaceLandmarker, FilesetResolver }, stream] = await Promise.all([
        import('@mediapipe/tasks-vision'),
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } }),
      ]);

      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      const fileset = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
      const landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
      });

      let raf = 0;
      const cleanup = () => {
        cancelAnimationFrame(raf);
        landmarker.close();
        stream.getTracks().forEach((t) => t.stop());
      };
      stopRef.current = cleanup;
      setPhase('countdown');

      const overlay = overlayRef.current!;
      const dpr = window.devicePixelRatio || 1;
      const cw = overlay.clientWidth;
      const ch = overlay.clientHeight;
      overlay.width = cw * dpr;
      overlay.height = ch * dpr;
      const octx = overlay.getContext('2d')!;

      const draw = (landmarks: { x: number; y: number }[] | undefined) => {
        octx.setTransform(dpr, 0, 0, dpr, 0, 0);
        octx.clearRect(0, 0, cw, ch);
        if (!landmarks) return;
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;
        const scale = Math.max(cw / vw, ch / vh);
        const dx = (cw - vw * scale) / 2;
        const dy = (ch - vh * scale) / 2;
        octx.fillStyle = 'rgba(126,213,152,.85)';
        for (const lm of landmarks) {
          const x = cw - (lm.x * vw * scale + dx);
          const y = lm.y * vh * scale + dy;
          octx.beginPath();
          octx.arc(x, y, 1.3, 0, Math.PI * 2);
          octx.fill();
        }
        const nose = landmarks[1];
        if (nose) {
          const x = cw - (nose.x * vw * scale + dx);
          const y = nose.y * vh * scale + dy;
          octx.fillStyle = '#E8762C';
          octx.strokeStyle = '#fff';
          octx.lineWidth = 2;
          octx.beginPath();
          octx.arc(x, y, 6, 0, Math.PI * 2);
          octx.fill();
          octx.stroke();
        }
      };

      const startCenter: number[] = [];

      const loop = () => {
        if (finishedRef.current) return;
        const now = performance.now();
        const res = landmarker.detectForVideo(video, now);
        const lms = res.faceLandmarks?.[0];
        draw(lms);
        const yaw = computeYawDeg(lms);
        if (yaw == null) {
          setPrompt(S.headTurn.faceNotFound);
          raf = requestAnimationFrame(loop);
          return;
        }
        framesRef.current.push({ t: now, yawDeg: yaw });

        // establish the centre from the first ~10 frames (looking straight)
        if (centerRef.current == null) {
          startCenter.push(yaw);
          if (startCenter.length >= 10) centerRef.current = startCenter.reduce((a, b) => a + b, 0) / startCenter.length;
          raf = requestAnimationFrame(loop);
          return;
        }

        const c = centerRef.current;
        const left = Math.max(0, c - yaw); // one side
        const right = Math.max(0, yaw - c); // other side
        if (left > FACIAL.minTurnDeg) leftRef.current = true;
        if (right > FACIAL.minTurnDeg) rightRef.current = true;
        setLeftDone(leftRef.current);
        setRightDone(rightRef.current);

        // guide: ask for whichever side isn't done yet
        if (!leftRef.current) {
          setPrompt(S.headTurn.lookLeft);
          if (settings.voiceOn && !spokenRef.current.left) {
            spokenRef.current.left = true;
            speak(S.headTurn.lookLeft);
          }
        } else if (!rightRef.current) {
          setPrompt(S.headTurn.lookRight);
          if (settings.voiceOn && !spokenRef.current.right) {
            spokenRef.current.right = true;
            speak(S.headTurn.lookRight);
          }
        } else {
          setPrompt(S.headTurn.good);
        }

        const elapsed = (now - framesRef.current[0].t) / 1000;
        if ((leftRef.current && rightRef.current) || elapsed >= FACIAL.captureS + 3) {
          finishedRef.current = true;
          cleanup();
          finish();
          return;
        }
        raf = requestAnimationFrame(loop);
      };

      beginScanRef.current = () => {
        setPhase('scanning');
        raf = requestAnimationFrame(loop);
      };
    } catch {
      stopRef.current();
      setPhase('error');
    }
  };

  const finish = () => {
    const m = computeFacialMetrics(framesRef.current);
    // Too few landmark frames means the camera never really saw the face.
    // Unlike the other tests this one fails toward a FALSE ALARM (asymmetry
    // and smoothness default to 1 → a high-risk score), so gating it matters
    // just as much: never tell someone they show concerning signs because
    // the camera couldn't find them.
    if (m.frames < MIN_VALID.facialFrames) {
      setPhase('invalid');
      return;
    }
    const metrics = {
      turnRangeDeg: m.turnRangeDeg,
      turnAsymmetry: m.turnAsymmetry,
      turnSmoothness: m.turnSmoothness,
      leftDeg: m.leftDeg,
      rightDeg: m.rightDeg,
      frames: m.frames,
    };
    const score = computeSubScore('facial', metrics);
    saveTestResult({ test: 'facial', metrics, subScore: score, timestamp: new Date().toISOString() }, settings.userType);
    setSubScore(score);
    setPhase('done');
  };

  if (phase === 'done') {
    return (
      <TestShell stepLabel={S.advancedTest} advanced title={S.tests.facial.title}>
        <TestDone subScore={subScore} />
      </TestShell>
    );
  }

  if (phase === 'invalid') {
    return (
      <TestShell stepLabel={S.advancedTest} advanced title={S.tests.facial.title}>
        <TestInvalid test="facial" onRetry={start} />
      </TestShell>
    );
  }

  if (phase === 'error') {
    return (
      <TestShell stepLabel={S.advancedTest} advanced title={S.tests.facial.title}>
        <PermissionDenied kind="camera" onRetry={start} />
      </TestShell>
    );
  }

  if (phase === 'intro') {
    return (
      <TestShell stepLabel={S.advancedTest} advanced title={S.tests.facial.title} instruction={S.tests.facial.instruction}>
        <TestIntro testId="facial" onStart={start} />
      </TestShell>
    );
  }

  return (
    <TestShell stepLabel={S.advancedTest} advanced title={S.tests.facial.title} instruction={S.tests.facial.instruction}>
      {/* progress chips */}
      <div className="flex items-center gap-2 mt-3">
        <span className={`flex-1 text-center text-base font-bold rounded-full py-2 ${leftDone ? 'bg-risk-low text-white' : 'bg-line-warm text-muted'}`}>
          {leftDone ? S.headTurn.leftDone : `← ${S.headTurn.lookLeft}`}
        </span>
        <span className={`flex-1 text-center text-base font-bold rounded-full py-2 ${rightDone ? 'bg-risk-low text-white' : 'bg-line-warm text-muted'}`}>
          {rightDone ? S.headTurn.rightDone : `${S.headTurn.lookRight} →`}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center my-4">
        <div className="relative w-[290px] h-[360px] rounded-[28px] overflow-hidden flex items-center justify-center bg-[linear-gradient(180deg,#3E4A56_0%,#2C3742_100%)]">
          <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
          <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />

          {phase === 'loading' && (
            <span className="relative text-white text-lg font-bold px-6 text-center leading-relaxed">{S.modelLoading}</span>
          )}

          <svg width="230" height="290" viewBox="0 0 230 290" className="absolute">
            <path
              d="M2 40 V16 a14 14 0 0 1 14-14 H40 M190 2 h24 a14 14 0 0 1 14 14 v24 M228 250 v24 a14 14 0 0 1-14 14 h-24 M40 288 H16 a14 14 0 0 1-14-14 v-24"
              stroke="#E8762C"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>

          {phase === 'countdown' && <Countdown inline hint={S.countdownHints.facial} onDone={() => beginScanRef.current()} />}

          {phase === 'scanning' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 bg-black/50 rounded-full px-5 py-2.5">
              <span className="text-lg font-bold text-white whitespace-nowrap">{prompt}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2.5 bg-secondary-soft rounded-2xl px-4 py-3 mb-4">
        <span className="flex-none mt-0.5">
          <ShieldIcon />
        </span>
        <span className="text-base font-semibold text-[#2B5A7E] leading-relaxed">{S.facialPrivacy}</span>
      </div>
    </TestShell>
  );
}
