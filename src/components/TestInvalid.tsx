import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './ui/Button';
import { useSettings } from '../context/SettingsContext';
import { speak, stopSpeaking } from '../lib/speech';
import { S } from '../lib/strings';
import type { TestId } from '../lib/types';

/**
 * Shown when an attempt produced too little data to score honestly.
 *
 * Nothing is saved. This exists because the alternative — scoring a failed
 * attempt — silently produced a *reassuring* result for four of the five
 * tests (and a false alarm for the fifth), so "the test didn't work" was
 * indistinguishable from "you are fine".
 */
export default function TestInvalid({ test, onRetry }: { test: TestId; onRetry: () => void }) {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const message = S.invalid[test];

  useEffect(() => {
    if (settings.voiceOn) speak(message);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 py-8">
      <div className="w-20 h-20 rounded-full bg-risk-med-bg flex items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path d="M12 3l9 16H3l9-16z" stroke="#9C7A10" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 10v4M12 17v.1" stroke="#9C7A10" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-2xl font-extrabold text-ink m-0">{S.invalid.title}</p>
      <p className="text-lg font-semibold text-muted-2 text-center leading-relaxed px-2 m-0">{message}</p>
      <p className="text-base font-medium text-muted text-center leading-relaxed px-2 m-0">{S.invalid.note}</p>
      <div className="w-full flex flex-col gap-3 mt-2">
        <Button className="nm-blink" onClick={onRetry}>
          {S.invalid.retry}
        </Button>
        <Button variant="outline" onClick={() => navigate('/home')}>
          {S.skip}
        </Button>
      </div>
    </div>
  );
}
