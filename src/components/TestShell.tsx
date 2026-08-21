import { useEffect, type ReactNode } from 'react';
import AppBar from './AppBar';
import { useSettings } from '../context/SettingsContext';
import { speak, stopSpeaking } from '../lib/speech';
import { S } from '../lib/strings';

/**
 * Shared chrome for test screens: back button, voice-replay button, step chip,
 * title, instruction, optional demo animation.
 * Speaks the instruction aloud on entry when voice guidance is enabled.
 */
export default function TestShell({
  stepLabel,
  advanced = false,
  title,
  instruction,
  demo,
  children,
}: {
  stepLabel: string;
  advanced?: boolean;
  title: string;
  instruction?: string;
  demo?: ReactNode;
  children: ReactNode;
}) {
  const { settings } = useSettings();
  const spokenText = instruction ? `${title}. ${instruction}` : '';

  useEffect(() => {
    if (settings.voiceOn && spokenText) speak(spokenText);
    return () => stopSpeaking();
    // speak once when the screen mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-dvh bg-bg flex flex-col px-6 pb-8 max-w-md mx-auto">
      <AppBar>
        {spokenText && (
          <button
            onClick={() => speak(spokenText)}
            aria-label={S.replayVoice}
            title={S.replayVoice}
            className="flex-none min-w-14 min-h-14 rounded-full bg-white border-2 border-[#E5E0D8] flex items-center justify-center cursor-pointer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 9v6h4l5 4V5L8 9H4z" stroke="#1B6CA8" strokeWidth="2" strokeLinejoin="round" fill="#E3EEF6" />
              <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" stroke="#1B6CA8" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <span
          // no ml-auto: pushed to the far right it stranded itself alone on a
          // second row at the largest text size, leaving the bar visibly
          // lopsided. As a plain group member it just follows the voice button.
          className={`flex-none text-base font-bold rounded-full px-3.5 py-1.5 ${
            advanced ? 'text-secondary bg-secondary-soft' : 'text-muted bg-line-warm'
          }`}
        >
          {stepLabel}
        </span>
      </AppBar>

      <h1 className="mt-4 text-3xl font-extrabold text-ink leading-tight">{title}</h1>
      {instruction && (
        <p className="mt-2 text-xl font-semibold text-muted-2 leading-relaxed whitespace-pre-line">{instruction}</p>
      )}
      {demo}
      {children}
    </div>
  );
}
