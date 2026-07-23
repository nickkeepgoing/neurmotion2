import { useEffect, useRef, useState } from 'react';
import { computeYawDeg } from '../../lib/facial';
import { S } from '../../lib/strings';
import { FACIAL } from '../../lib/thresholds';

/**
 * Live camera with the face mesh and left/right turn indicators — the real
 * test's interface, but nothing is captured or scored. This is also where the
 * camera permission prompt happens, so a denial can't kill a scored run.
 */
export default function HeadTurnPractice() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef<() => void>(() => {});
  const centerRef = useRef<number | null>(null);
  const [state, setState] = useState<'starting' | 'live' | 'denied'>('starting');
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ FaceLandmarker, FilesetResolver }, stream] = await Promise.all([
          import('@mediapipe/tasks-vision'),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } }),
        ]);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
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
        if (cancelled) {
          landmarker.close();
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setState('live');

        const overlay = overlayRef.current!;
        const dpr = window.devicePixelRatio || 1;
        const cw = overlay.clientWidth;
        const ch = overlay.clientHeight;
        overlay.width = cw * dpr;
        overlay.height = ch * dpr;
        const octx = overlay.getContext('2d')!;
        let raf = 0;
        const startCenter: number[] = [];

        const loop = () => {
          const now = performance.now();
          const res = landmarker.detectForVideo(video, now);
          const lms = res.faceLandmarks?.[0];

          octx.setTransform(dpr, 0, 0, dpr, 0, 0);
          octx.clearRect(0, 0, cw, ch);
          setSeen(!!lms);
          if (lms) {
            const vw = video.videoWidth || 640;
            const vh = video.videoHeight || 480;
            const scale = Math.max(cw / vw, ch / vh);
            const ox = (cw - vw * scale) / 2;
            const oy = (ch - vh * scale) / 2;
            octx.fillStyle = 'rgba(126,213,152,.85)';
            for (const lm of lms) {
              octx.beginPath();
              octx.arc(cw - (lm.x * vw * scale + ox), lm.y * vh * scale + oy, 1.2, 0, Math.PI * 2);
              octx.fill();
            }
            const yaw = computeYawDeg(lms);
            if (yaw != null) {
              if (centerRef.current == null) {
                startCenter.push(yaw);
                if (startCenter.length >= 10) centerRef.current = startCenter.reduce((a, b) => a + b, 0) / startCenter.length;
              } else {
                const c = centerRef.current;
                if (c - yaw > FACIAL.minTurnDeg) setLeft(true);
                if (yaw - c > FACIAL.minTurnDeg) setRight(true);
              }
            }
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);

        stopRef.current = () => {
          cancelAnimationFrame(raf);
          landmarker.close();
          stream.getTracks().forEach((t) => t.stop());
        };
      } catch {
        if (!cancelled) setState('denied');
      }
    })();
    return () => {
      cancelled = true;
      stopRef.current();
    };
  }, []);

  if (state === 'denied') {
    return <p className="text-lg font-semibold text-muted-2 text-center leading-relaxed px-4">{S.flow.practiceNoCamera}</p>;
  }

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 w-full">
        <span className={`flex-1 text-center text-base font-bold rounded-full py-2 ${left ? 'bg-risk-low text-white' : 'bg-line-warm text-muted'}`}>
          {left ? S.headTurn.leftDone : `← ${S.headTurn.lookLeft}`}
        </span>
        <span className={`flex-1 text-center text-base font-bold rounded-full py-2 ${right ? 'bg-risk-low text-white' : 'bg-line-warm text-muted'}`}>
          {right ? S.headTurn.rightDone : `${S.headTurn.lookRight} →`}
        </span>
      </div>

      <div className="relative w-[250px] h-[300px] rounded-[24px] overflow-hidden flex items-center justify-center bg-[linear-gradient(180deg,#3E4A56_0%,#2C3742_100%)]">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
        <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        {state === 'starting' && (
          <span className="relative text-white text-lg font-bold px-6 text-center">{S.modelLoading}</span>
        )}
        {state === 'live' && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 rounded-full px-4 py-2">
            <span className="text-base font-bold text-white whitespace-nowrap">
              {seen ? S.flow.faceFound : S.headTurn.faceNotFound}
            </span>
          </div>
        )}
      </div>

      <p className="text-base font-semibold text-muted-2 text-center m-0">{S.flow.practiceFacial}</p>
    </div>
  );
}
