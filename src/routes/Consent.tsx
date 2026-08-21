import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { ShieldIcon } from '../components/icons';
import { useSettings } from '../context/SettingsContext';
import { S } from '../lib/strings';
import type { Settings } from '../lib/types';

function ConsentBox({
  checked,
  onChange,
  title,
  desc,
  required,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  desc: string;
  required?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-4 p-4.5 rounded-tile border-[3px] cursor-pointer transition-colors ${
        checked ? 'border-secondary bg-secondary-soft' : 'border-field bg-white'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-7 h-7 flex-none accent-[#1B6CA8] cursor-pointer"
      />
      <span className="flex flex-col gap-1.5">
        <span className="text-xl font-extrabold text-ink leading-snug">
          {title}
          {required && <span className="text-risk-high-text"> *</span>}
        </span>
        <span className="text-base font-medium text-muted-2 leading-relaxed">{desc}</span>
      </span>
    </label>
  );
}

export default function Consent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { update } = useSettings();
  /** profile carried from login/register, held in memory until consent */
  const pendingProfile = (location.state as { profile?: Partial<Settings> } | null)?.profile;
  // PDPA: both boxes start UNCHECKED — the user must actively opt in.
  const [storeOk, setStoreOk] = useState(false);
  const [trainOk, setTrainOk] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const accept = () => {
    if (!storeOk) {
      setShowHint(true);
      return;
    }
    // Persist the profile carried from login/register ONLY now that consent
    // has actually been given (PDPA: no collection without a lawful basis).
    update({ ...(pendingProfile ?? {}), consented: true, consentTraining: trainOk });
    navigate('/home');
  };

  return (
    <>
    {/* pb reserve is in rem so it grows with the text scale and never hides the
        sticky footer's content */}
    <div className="min-h-dvh bg-bg flex flex-col px-6 pt-8 pb-[13rem] max-w-md mx-auto">
      <div className="w-16 h-16 rounded-tile bg-secondary-soft flex items-center justify-center">
        <ShieldIcon size={34} />
      </div>
      <h1 className="mt-4 text-3xl font-extrabold text-ink leading-tight">{S.consent.title}</h1>
      <p className="mt-2 text-lg font-medium text-muted-2 leading-relaxed">{S.consent.subtitle}</p>

      <div className="flex flex-col gap-3.5 mt-6">
        <ConsentBox checked={storeOk} onChange={(v) => { setStoreOk(v); if (v) setShowHint(false); }} title={S.consent.box1Title} desc={S.consent.box1Desc} required />
        <ConsentBox checked={trainOk} onChange={setTrainOk} title={S.consent.box2Title} desc={S.consent.box2Desc} />
      </div>

      {showHint && (
        <p className="mt-4 text-lg font-bold text-risk-high-text bg-risk-high-bg rounded-2xl px-4 py-3" role="alert">
          {S.consent.mustAccept}
        </p>
      )}

      {/* the long PDPA note belongs in the scroll area — footers are for actions */}
      <p className="mt-6 text-base font-medium text-muted-2 text-center leading-relaxed">{S.consent.dataNote}</p>
    </div>

    {/* Sticky footer: at A++ the accept button used to sit 333px below the
        fold, so the user who most needs the large text could not reach the
        only way forward. */}
    <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-6 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-[rgba(255,249,242,.96)] backdrop-blur-md border-t border-line-warm shadow-bar flex flex-col gap-2">
      <p className={`text-base font-semibold text-center m-0 ${storeOk ? 'text-risk-low-text' : 'text-muted-2'}`}>
        {storeOk ? S.consent.readyToStart : S.consent.mustAccept}
      </p>
      {/* Deliberately NOT `disabled`: a disabled button never fires onClick,
          so the "please tick box 1" hint was unreachable dead code and the
          user just tapped a faded button and got silence. */}
      <Button onClick={accept} className={storeOk ? 'nm-blink' : ''}>
        {S.consent.accept}
      </Button>
    </footer>
    </>
  );
}
