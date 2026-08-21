import { useEffect, useRef, useState } from 'react';
import Sheet from './ui/Sheet';
import { S } from '../lib/strings';

/** Longest edge of the stored avatar, in px. */
const AVATAR_PX = 256;

/**
 * Take a profile picture with the front camera.
 *
 * The photo never leaves the device: the frame is drawn to a canvas, downscaled
 * to AVATAR_PX and kept as a JPEG data URL in the same local settings blob as
 * everything else. Nothing is uploaded and nothing is analysed — this is an
 * avatar the user picked, not test data, and it is not attached to any result.
 *
 * The preview is mirrored (`scale-x-[-1]`) because people expect a mirror when
 * framing themselves. The capture is mirrored to match, so the saved picture
 * looks like what they were looking at when they pressed the button.
 */
export default function AvatarCapture({
  onSave,
  onClose,
}: {
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<'starting' | 'live' | 'preview' | 'denied'>('starting');
  const [shot, setShot] = useState<string | null>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setPhase('live');
      } catch {
        if (!cancelled) setPhase('denied');
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    // square centre crop, so the round avatar is never stretched
    const side = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - side) / 2;
    const sy = (video.videoHeight - side) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_PX;
    canvas.height = AVATAR_PX;
    const ctx = canvas.getContext('2d')!;
    ctx.translate(AVATAR_PX, 0);
    ctx.scale(-1, 1); // match the mirrored preview
    ctx.drawImage(video, sx, sy, side, side, 0, 0, AVATAR_PX, AVATAR_PX);
    setShot(canvas.toDataURL('image/jpeg', 0.82));
    setPhase('preview');
    stop();
  };

  const retake = () => {
    setShot(null);
    setPhase('starting');
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setPhase('live');
      } catch {
        setPhase('denied');
      }
    })();
  };

  return (
    <Sheet title={S.profile.photoTitle} onClose={onClose}>
      {phase === 'denied' ? (
        <p className="text-lg font-semibold text-muted-2 leading-relaxed text-center m-0">{S.profile.photoDenied}</p>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-[240px] h-[240px] rounded-full overflow-hidden bg-line-warm border-4 border-white shadow-raised">
            {shot ? (
              <img src={shot} alt="" className="w-full h-full object-cover" />
            ) : (
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            )}
          </div>

          <p className="text-base font-semibold text-muted text-center leading-relaxed m-0">{S.profile.photoPrivacy}</p>

          {phase === 'preview' ? (
            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={() => shot && onSave(shot)}
                className="w-full min-h-16 rounded-[16px] bg-primary text-white text-xl font-extrabold border-0 cursor-pointer"
              >
                {S.profile.photoUse}
              </button>
              <button
                onClick={retake}
                className="w-full min-h-16 rounded-[16px] bg-white text-muted-2 text-xl font-bold border-2 border-field cursor-pointer"
              >
                {S.profile.photoRetake}
              </button>
            </div>
          ) : (
            <button
              onClick={capture}
              disabled={phase !== 'live'}
              className="w-full min-h-16 rounded-[16px] bg-primary text-white text-xl font-extrabold border-0 cursor-pointer disabled:opacity-50"
            >
              {phase === 'live' ? S.profile.photoTake : S.profile.photoStarting}
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}
