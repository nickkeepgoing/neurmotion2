import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { ShieldIcon } from '../components/icons';
import { useSettings } from '../context/SettingsContext';
import { S } from '../lib/strings';

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
      className={`flex items-start gap-4 p-4.5 rounded-[20px] border-[3px] cursor-pointer transition-colors ${
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
  const { update } = useSettings();
  // PDPA: both boxes start UNCHECKED — the user must actively opt in.
  const [storeOk, setStoreOk] = useState(false);
  const [trainOk, setTrainOk] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const accept = () => {
    if (!storeOk) {
      setShowHint(true);
      return;
    }
    update({ consented: true, consentTraining: trainOk });
    navigate('/home');
  };

  return (
    <div className="min-h-dvh bg-bg flex flex-col px-6 pt-8 pb-8 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-[18px] bg-secondary-soft flex items-center justify-center">
        <ShieldIcon size={34} />
      </div>
      <h1 className="mt-4 text-[28px] font-extrabold text-ink leading-tight">{S.consent.title}</h1>
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

      <div className="mt-auto pt-6 flex flex-col gap-3.5">
        <p className="text-[15px] font-medium text-muted text-center leading-relaxed">{S.consent.dataNote}</p>
        <Button onClick={accept} disabled={!storeOk} className={storeOk ? 'nm-blink' : ''}>
          {S.consent.accept}
        </Button>
      </div>
    </div>
  );
}
