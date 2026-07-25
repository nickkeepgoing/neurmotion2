import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './ui/Button';
import { CheckCircle } from './icons';
import { useSettings } from '../context/SettingsContext';
import { speak, stopSpeaking } from '../lib/speech';
import { clearRetestRound, completedThisRound } from '../lib/storage';
import { S } from '../lib/strings';
import type { TestId } from '../lib/types';

const TEST_ORDER: TestId[] = ['spiral', 'tapping', 'tremor', 'facial', 'voice'];

/**
 * Post-test success panel. Chains straight into the next incomplete test so
 * the user can finish all 5 without going back to the dashboard.
 * Uses the current retest round (not just "done today") so "ทำการทดสอบอีกครั้ง"
 * walks through all 5 again.
 */
export default function TestDone({ subScore }: { subScore: number }) {
  const navigate = useNavigate();
  const { settings } = useSettings();
  /* Brief "analysing" beat before the result. The score is already computed;
     this exists so finishing doesn't feel abrupt and the user isn't rushed
     straight into the next test. */
  const [analyzing, setAnalyzing] = useState(true);
  const next = useMemo(() => {
    const done = completedThisRound();
    return TEST_ORDER.find((t) => !done.has(t));
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setAnalyzing(false), 1600);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (analyzing) return;
    if (!next) clearRetestRound(); // round finished — future chaining is daily again
    if (settings.voiceOn) speak(next ? S.testDoneSpoken : S.allDoneSpoken);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzing]);

  if (analyzing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-10" role="status" aria-live="polite">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[6px] border-line" />
          <div className="absolute inset-0 rounded-full border-[6px] border-transparent border-t-secondary nm-spin" />
        </div>
        <p className="text-2xl font-extrabold text-ink m-0">{S.analyzing}</p>
        <p className="text-lg font-semibold text-muted-2 text-center m-0">{S.analyzingSub}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 py-10">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-risk-low opacity-20" />
        <CheckCircle size={96} />
      </div>
      <p className="text-2xl font-extrabold text-ink">{S.testDone}</p>
      <p className="text-lg font-semibold text-muted-2">บันทึกผลเรียบร้อยแล้ว</p>
      <div className="w-full flex flex-col gap-3 mt-4">
        {next ? (
          <>
            <Button className="nm-blink" onClick={() => navigate(`/test/${next}`)}>
              {S.nextTest(S.tests[next].name)}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
            <Button variant="outline" onClick={() => navigate('/home')}>
              {S.backHome}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" className="nm-blink" onClick={() => navigate('/result')}>
              {S.home.viewResult}
            </Button>
            <Button variant="outline" onClick={() => navigate('/home')}>
              {S.backHome}
            </Button>
          </>
        )}
      </div>
      <span className="sr-only">คะแนน {subScore}</span>
    </div>
  );
}
