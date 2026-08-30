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
  const replay = useRef<HTMLVideoElement>(null);

  const stopVideo = () => {
    if (replay.current) {
      replay.current.pause();
      try {
        replay.current.currentTime = 0;
      } catch {
        /* ignore if video not loaded */
      }
    }
  };

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

  // Clean up media and speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopVideo();
    };
  }, []);

  // speak the caption for the current step
  // IMPORTANT: When a custom tutorial video is present (videoUrl or hasClip),
  // DO NOT speak the default TTS caption on step 0 to prevent voice overlap!
  useEffect(() => {
    if (settings.voiceOn) {
      if (step === 0) {
        if (!videoUrl && !hasClip) {
          speak(caption);
        } else {
          stopSpeaking();
        }
      } else if (step === 1) {
        stopVideo();
        speak(S.flow.practiceHint);
      }
    } else {
      stopSpeaking();
    }
    return () => stopSpeaking();
  }, [step, videoUrl, hasClip, caption, settings.voiceOn]);

  const handleGoToPractice = () => {
    stopSpeaking();
    stopVideo();
    setStep(1);
  };

  const handleStartReal = () => {
    stopSpeaking();
    stopVideo();
    onStart();
  };

  const handleWatchAgain = () => {
    stopSpeaking();
    setStep(0);
  };

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
                className="w-full max-h-[46vh] rounded-tile bg-black"
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

          <Button className="nm-blink mt-3" onClick={handleGoToPractice}>
            {S.flow.toPractice}
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col flex-1">
          <div className="mt-4 flex items-center justify-between gap-2">
            <h2 className="text-xl font-extrabold text-ink">{S.flow.practiceTitle}</h2>
            <button
              onClick={handleWatchAgain}
              className="flex-none min-h-11 pl-2.5 pr-3.5 rounded-full bg-secondary-soft border-0 flex items-center gap-1.5 cursor-pointer active:scale-[.97] transition-transform"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-none">
                <path d="M4 4v6h6M20 20v-6h-6" stroke="#1B6CA8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M19 9a8 8 0 0 0-14-2.5M5 15a8 8 0 0 0 14 2.5" stroke="#1B6CA8" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              <span className="text-base font-bold text-secondary">{S.flow.watchAgain}</span>
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

          <Button className="nm-blink" onClick={handleStartReal}>
            {S.flow.toReal}
          </Button>
        </div>
      )}
    </div>
  );
}
