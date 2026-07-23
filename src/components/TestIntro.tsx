import { useEffect, useRef, useState, type ReactNode } from 'react';
import TestDemo from './TestDemo';
import TestStages from './TestStages';
import Button from './ui/Button';
import { useSettings } from '../context/SettingsContext';
import { speak, stopSpeaking } from '../lib/speech';
import { S } from '../lib/strings';
import { getVideoUrl, hasVideo } from '../lib/videos';
import type { TestId } from '../lib/types';

/**
 * 3-step gate shown before every test:
 *   1. ดูคลิป — an admin-uploaded tutorial video (falls back to the demo animation)
 *   2. ทดลองใช้ — interactive practice (no scoring)
 *   3. ทดสอบจริง — handed off to the parent via onStart()
 *
 * `practice` is an optional interactive node; when omitted, the practice step
 * simply re-shows the demo so the user can study the motion.
 */
export default function TestIntro({
  testId,
  onStart,
  practice,
}: {
  testId: TestId;
  onStart: () => void;
  practice?: ReactNode;
}) {
  const { settings } = useSettings();
  const [step, setStep] = useState<0 | 1>(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const hasClip = hasVideo(testId);
  const caption = S.demoCaption[testId];

  // load the admin clip (if any) and clean up its object URL
  useEffect(() => {
    let url: string | null = null;
    getVideoUrl(testId).then((u) => {
      url = u;
      setVideoUrl(u);
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [testId]);

  // speak the caption for the current step
  useEffect(() => {
    if (settings.voiceOn) speak(step === 0 ? caption : S.flow.practiceHint);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const replay = useRef<HTMLVideoElement>(null);

  return (
    <div className="flex flex-col flex-1">
      <TestStages current={step === 0 ? 0 : 1} />

      {step === 0 && (
        <div className="flex flex-col flex-1">
          <h2 className="mt-4 text-xl font-extrabold text-ink">{S.flow.watchTitle}</h2>

          <div className="mt-3 flex-1 flex flex-col items-center justify-center gap-3">
            {videoUrl ? (
              <video
                ref={replay}
                src={videoUrl}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[46vh] rounded-[20px] bg-black"
              />
            ) : (
              <>
                <div className="w-full">
                  <TestDemo test={testId} />
                </div>
                {!hasClip && (
                  <p className="text-base font-semibold text-muted-2 text-center leading-relaxed px-2">{S.flow.noVideo}</p>
                )}
              </>
            )}
          </div>

          <Button className="nm-blink mt-3" onClick={() => setStep(1)}>
            {S.flow.toPractice}
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col flex-1">
          <div className="mt-4 flex items-baseline justify-between gap-2">
            <h2 className="text-xl font-extrabold text-ink">{S.flow.practiceTitle}</h2>
            <button onClick={() => setStep(0)} className="min-h-14 px-2 text-base font-bold text-secondary bg-transparent border-0 underline cursor-pointer">
              {S.flow.watchAgain}
            </button>
          </div>
          <p className="mt-1 text-base font-semibold text-muted-2">{S.flow.practiceHint}</p>

          <div className="flex-1 flex flex-col items-center justify-center py-2">
            {practice ?? (
              <div className="flex flex-col items-center gap-3 w-full">
                <div className="w-full my-2">
                  <TestDemo test={testId} />
                </div>
                <p className="text-base font-semibold text-muted-2 text-center px-4">{S.flow.practiceGeneric}</p>
              </div>
            )}
          </div>

          <Button className="nm-blink" onClick={onStart}>
            {S.flow.toReal}
          </Button>
        </div>
      )}
    </div>
  );
}
