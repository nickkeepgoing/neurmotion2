import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { HandPulse } from '../components/icons';
import { S } from '../lib/strings';

export default function Splash() {
  const navigate = useNavigate();
  return (
    // centred as one group so the button reads with the logo instead of being
    // glued to the bottom edge, with safe-area padding so the Android nav bar
    // never clips the footnote
    <div className="min-h-dvh flex flex-col items-center justify-center gap-10 px-7 pt-10 pb-[calc(2rem+env(safe-area-inset-bottom))] max-w-md mx-auto bg-[linear-gradient(180deg,#FFF9F2_0%,#FDF3E7_55%,#FBEEDC_100%)]">
      <div className="flex flex-col items-center">
        <div className="relative w-[172px] h-[172px] flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary nm-pulse" />
          <div className="absolute inset-[14px] rounded-full bg-primary-softer" />
          <div className="absolute inset-[26px] rounded-full bg-white shadow-[0_8px_24px_rgba(232,118,44,.22)]" />
          <div className="relative">
            <HandPulse />
          </div>
        </div>
        <h1 className="mt-7 font-num font-black text-4xl text-ink tracking-tight text-center">{S.appName}</h1>
        <p className="mt-3 text-xl font-semibold text-muted-2 text-center leading-relaxed whitespace-pre-line max-w-72">
          {S.tagline}
        </p>
      </div>

      <div className="w-full flex flex-col gap-4">
        <Button className="min-h-[68px] text-3xl nm-blink" onClick={() => navigate('/login')}>
          {S.start}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
        <p className="text-base font-medium text-muted text-center">{S.splashFootnote}</p>
      </div>
    </div>
  );
}
