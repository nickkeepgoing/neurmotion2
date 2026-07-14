import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Countdown from '../../components/Countdown';
import TestDemo from '../../components/TestDemo';
import TestDone from '../../components/TestDone';
import TestShell from '../../components/TestShell';
import Button from '../../components/ui/Button';
import { ShieldIcon } from '../../components/icons';
import { useSettings } from '../../context/SettingsContext';
import { computeFacialMetrics, EXPRESSION_SHAPES, type FaceFrame } from '../../lib/facial';
import { computeSubScore } from '../../lib/scoring';
import { saveTestResult } from '../../lib/storage';
import { S } from '../../lib/strings';
import { FACIAL } from '../../lib/thresholds';

type Phase = 'ready' | 'loading' | 'countdown' | 'scanning' | 'done' | 'error';

/**
 * MediaPipe Face Landmarker runs entirely in the browser; frames never leave
 * the device (PDPA) — only blendshape numbers are kept.
 */
export default function FacialTest() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('ready');
  const [holdLeft, setHoldLeft] = useState(FACIAL.holdS);
  const [subScore, setSubScore] = useState(0);
  const [smiling, setSmiling] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<FaceFrame[]>([]);
  const holdStartRef = useRef<number | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const beginScanRef = useRef<() => void>(() => {});
  const finishedRef = useRef(false);

  useEffect(() => () => stopRef.current(), []);

  const start = async () => {
    setPhase('loading');
    finishedRef.current = false;
    framesRef.current = [];
    holdStartRef.current = null;
    try {
      const [{ FaceLandmarker, FilesetResolver }, stream] = await Promise.all([
        import('@mediapipe/tasks-vision'),
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } }),
      ]);

      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      const fileset = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      const landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        },
        outputFaceBlendshapes: true,
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

      // camera + model ready → 3-2-1 countdown, then scanning starts
      setPhase('countdown');

      // overlay canvas for live landmark dots (drawn locally, never uploaded)
      const overlay = overlayRef.current!;
      const dpr = window.devicePixelRatio || 1;
      const cw = overlay.clientWidth;
      const ch = overlay.clientHeight;
      overlay.width = cw * dpr;
      overlay.height = ch * dpr;
      const octx = overlay.getContext('2d')!;

      const drawLandmarks = (landmarks: { x: number; y: number }[] | undefined, isSmiling: boolean) => {
        octx.setTransform(dpr, 0, 0, dpr, 0, 0);
        octx.clearRect(0, 0, cw, ch);
        if (!landmarks) return;
        // map normalized video coords → container with object-cover crop, mirrored like the video
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;
        const scale = Math.max(cw / vw, ch / vh);
        const dx = (cw - vw * scale) / 2;
        const dy = (ch - vh * scale) / 2;
        octx.fillStyle = 'rgba(126,213,152,.9)'; // soft green mesh dots
        for (const lm of landmarks) {
          const x = cw - (lm.x * vw * scale + dx); // mirror
          const y = lm.y * vh * scale + dy;
          octx.beginPath();
          octx.arc(x, y, 1.4, 0, Math.PI * 2);
          octx.fill();
        }
        // mouth corners highlighted — they drive the smile metric
        const corners = [61, 291]; // MediaPipe mouth-corner indices
        octx.fillStyle = isSmiling ? '#7ED598' : '#E8762C';
        for (const i of corners) {
          const lm = landmarks[i];
          if (!lm) continue;
          const x = cw - (lm.x * vw * scale + dx);
          const y = lm.y * vh * scale + dy;
          octx.beginPath();
          octx.arc(x, y, 5, 0, Math.PI * 2);
          octx.fill();
          octx.strokeStyle = '#FFFFFF';
          octx.lineWidth = 2;
          octx.stroke();
        }
      };

      const loop = () => {
        if (finishedRef.current) return;
        const now = performance.now();
        const res = landmarker.detectForVideo(video, now);
        const shapes = res.faceBlendshapes?.[0]?.categories;
        if (shapes) {
          const get = (name: string) => shapes.find((c) => c.categoryName === name)?.score ?? 0;
          const smileL = get('mouthSmileLeft');
          const smileR = get('mouthSmileRight');
          const frame: FaceFrame = { t: now, smileL, smileR, expr: EXPRESSION_SHAPES.map(get) };

          const isSmiling = (smileL + smileR) / 2 > 0.35;
          setSmiling(isSmiling);
          drawLandmarks(res.faceLandmarks?.[0], isSmiling);

          if (isSmiling) {
            if (holdStartRef.current == null) holdStartRef.current = now;
            framesRef.current.push(frame);
            const held = (now - holdStartRef.current) / 1000;
            setHoldLeft(Math.max(0, Math.ceil(FACIAL.holdS - held)));
            if (held >= FACIAL.holdS) {
              finishedRef.current = true;
              cleanup();
              finish();
              return;
            }
          } else {
            holdStartRef.current = null;
            setHoldLeft(FACIAL.holdS);
          }
        } else {
          drawLandmarks(undefined, false); // face lost — clear the mesh
        }
        raf = requestAnimationFrame(loop);
      };
      // started by the countdown's onDone
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
    const metrics = { smileAmplitude: m.smileAmplitude, asymmetry: m.asymmetry, movement: m.movement, frames: m.frames };
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

  return (
    <TestShell
      stepLabel={S.advancedTest}
      advanced
      title={S.tests.facial.title}
      instruction={S.tests.facial.instruction}
      demo={phase === 'ready' ? <TestDemo test="facial" /> : undefined}
    >
      {/* Camera frame — compact in ready so the start button stays above the fold */}
      <div className={`flex items-center justify-center ${phase === 'ready' ? 'my-3' : 'flex-1 my-4'}`}>
        <div
          className={`relative rounded-[28px] overflow-hidden flex items-center justify-center bg-[linear-gradient(180deg,#3E4A56_0%,#2C3742_100%)] ${
            phase === 'ready' ? 'w-[200px] h-[180px]' : 'w-[290px] h-[360px]'
          }`}
        >
          <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
          <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />

          {phase === 'ready' && (
            <svg width="90" height="115" viewBox="0 0 150 190" fill="none" className="relative opacity-90">
              <ellipse cx="75" cy="78" rx="52" ry="62" fill="#55636F" />
              <path d="M23 190 c0-32 24-48 52-48 s52 16 52 48" fill="#55636F" />
              <path d="M52 92 q23 20 46 0" stroke="#FBEEDC" strokeWidth="5" strokeLinecap="round" fill="none" />
              <circle cx="55" cy="66" r="5" fill="#FBEEDC" />
              <circle cx="95" cy="66" r="5" fill="#FBEEDC" />
            </svg>
          )}

          {(phase === 'loading' || phase === 'error') && (
            <span className="relative text-white text-lg font-bold px-6 text-center leading-relaxed">
              {phase === 'loading' ? S.modelLoading : S.permissionDenied}
            </span>
          )}

          {/* corner brackets (full-size frame only) */}
          {phase !== 'ready' && (
            <svg width="230" height="290" viewBox="0 0 230 290" className="absolute">
              <path
                d="M2 40 V16 a14 14 0 0 1 14-14 H40 M190 2 h24 a14 14 0 0 1 14 14 v24 M228 250 v24 a14 14 0 0 1-14 14 h-24 M40 288 H16 a14 14 0 0 1-14-14 v-24"
                stroke="#E8762C"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          )}

          {phase === 'scanning' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 bg-black/45 rounded-full px-4.5 py-2.5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#7ED598" strokeWidth="2.2" />
                <path d="M8 13.5 q4 4 8 0" stroke="#7ED598" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="9" cy="9.5" r="1.3" fill="#7ED598" />
                <circle cx="15" cy="9.5" r="1.3" fill="#7ED598" />
              </svg>
              <span className="text-lg font-bold text-white whitespace-nowrap">
                {smiling ? S.holdSmile(holdLeft) : 'ยิ้มกว้าง ๆ ค่ะ'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Privacy note */}
      <div className="flex items-start gap-2.5 bg-secondary-soft rounded-2xl px-4 py-3 mb-4">
        <span className="flex-none mt-0.5">
          <ShieldIcon />
        </span>
        <span className="text-base font-semibold text-[#2B5A7E] leading-relaxed">{S.facialPrivacy}</span>
      </div>

      {phase === 'ready' && (
        <>
          <div className="flex-1" />
          <Button className="nm-blink" onClick={start}>
            {S.ready}
          </Button>
        </>
      )}
      {phase === 'error' && (
        <Button variant="outline" onClick={() => navigate('/home')}>
          {S.skip}
        </Button>
      )}

      {phase === 'countdown' && <Countdown onDone={() => beginScanRef.current()} />}
    </TestShell>
  );
}
