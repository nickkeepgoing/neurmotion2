import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BirthDatePicker, {
  ageFromBirthDate,
  birthDateFromISO,
  birthDateToISO,
  type BirthDate,
} from '../components/ui/BirthDatePicker';
import Button from '../components/ui/Button';
import TextSizeToggle from '../components/ui/TextSizeToggle';
import { CheckCircle } from '../components/icons';
import { useSettings } from '../context/SettingsContext';
import { S } from '../lib/strings';

function TypeCard({
  selected,
  onClick,
  iconBg,
  icon,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`flex items-center gap-4 w-full min-h-[88px] px-4.5 py-4 rounded-[20px] text-left cursor-pointer border-[3px] transition-colors ${
        selected ? 'border-primary bg-primary-soft' : 'border-field bg-white hover:border-secondary'
      }`}
    >
      <div className={`flex-none w-14 h-14 rounded-full flex items-center justify-center ${iconBg}`}>{icon}</div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xl font-extrabold text-ink">{title}</span>
        <span className="text-base font-medium text-muted-2">{desc}</span>
      </div>
      {selected && (
        <span className="ml-auto flex-none">
          <CheckCircle size={26} />
        </span>
      )}
    </button>
  );
}

/** Numbered section header — makes the order to follow obvious. */
function StepHeader({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-center gap-3 mt-7 mb-3">
      <span className="flex-none w-9 h-9 rounded-full bg-secondary text-white flex items-center justify-center font-num text-xl font-black">
        {n}
      </span>
      <h2 className="text-2xl font-extrabold text-ink m-0">{text}</h2>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { settings, update } = useSettings();
  const [userType, setUserType] = useState<'general' | 'patient'>(settings.userType);
  const [birth, setBirth] = useState<BirthDate>(
    () => (settings.birthDate && birthDateFromISO(settings.birthDate)) || { d: 1, m: 0, yBE: 2500 }
  );
  const [nid, setNid] = useState(settings.nationalId ?? '');
  const age = ageFromBirthDate(birth);

  const start = () => {
    const profile = {
      userType,
      age,
      birthDate: birthDateToISO(birth),
      nationalId: userType === 'patient' && nid.trim() ? nid.trim() : undefined,
    };
    if (settings.consented) {
      update(profile);
      navigate('/home');
      return;
    }
    // PDPA: nothing personal may be persisted before consent is given. Carry
    // the profile to the consent screen in router state instead of writing it
    // (birth date, age and national ID are personal data).
    navigate('/consent', { state: { profile } });
  };

  return (
    <>
    {/* pb reserve (rem) so the sticky footer never covers the last field */}
    <div className="min-h-dvh bg-bg flex flex-col px-6 pt-7 pb-[11rem] max-w-md mx-auto">
      <h1 className="text-3xl font-extrabold text-ink">{S.login.title}</h1>

      {/* size control — a light helper, not a heavy card, so it doesn't compete
          with the title as the first thing on screen */}
      <p className="mt-1.5 text-base font-semibold text-muted-2">{S.login.sizeHelper}</p>
      <div className="mt-2">
        <TextSizeToggle />
      </div>

      {/* STEP 1 — choose user type */}
      <StepHeader n={1} text={S.login.step1} />
      <div className="flex flex-col gap-3.5">
        <TypeCard
          selected={userType === 'general'}
          onClick={() => setUserType('general')}
          iconBg="bg-primary"
          icon={
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="#fff" strokeWidth="2.4" />
              <path d="M4 20c0-3.3 3.6-5.5 8-5.5s8 2.2 8 5.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          }
          title={S.login.general}
          desc={S.login.generalDesc}
        />
        <TypeCard
          selected={userType === 'patient'}
          onClick={() => setUserType('patient')}
          iconBg="bg-secondary-soft"
          icon={
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M12 4v16M4 12h16" stroke="#1B6CA8" strokeWidth="3" strokeLinecap="round" />
            </svg>
          }
          title={S.login.patient}
          desc={S.login.patientDesc}
        />
      </div>

      {/* STEP 2 — birth date only (general); no other personal data required */}
      <StepHeader n={2} text={S.login.step2} />
      <p className="text-base font-semibold text-muted-2 mb-2 -mt-1">{S.login.birthHelp}</p>
      <BirthDatePicker value={birth} onChange={setBirth} />
      <div className="mt-3 self-start flex items-center gap-2 bg-secondary-soft rounded-full px-4 py-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#1B6CA8" strokeWidth="2" />
          <path d="M12 7v5l3 2" stroke="#1B6CA8" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="text-lg font-extrabold text-secondary">{S.login.ageShow(age)}</span>
      </div>

      {/* patient: national ID (full patient system is future work) */}
      {userType === 'patient' && (
        <label className="flex flex-col gap-2 mt-5">
          <span className="text-lg font-bold text-ink">{S.login.nidLabel}</span>
          <input
            value={nid}
            onChange={(e) => setNid(e.target.value.replace(/\D/g, '').slice(0, 13))}
            placeholder={S.login.nidPlaceholder}
            inputMode="numeric"
            className="min-h-16 rounded-[18px] border-2 border-field bg-white px-5 text-xl font-semibold text-ink placeholder:text-muted focus:border-secondary focus:outline-none tracking-wider"
          />
          <span className="text-base font-medium text-muted leading-relaxed">{S.login.nidNote}</span>
        </label>
      )}
    </div>

    {/* sticky footer keeps the one primary action always visible and prominent */}
    <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-6 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-[rgba(255,249,242,.96)] backdrop-blur-md border-t border-line-warm shadow-[0_-6px_18px_rgba(35,58,77,.07)] flex flex-col gap-2">
      <Button className="nm-blink" onClick={start}>
        {S.start}
      </Button>
      <p className="text-base font-medium text-muted-2 text-center m-0">
        {S.login.noAccount}{' '}
        <button onClick={() => navigate('/register')} className="min-h-11 px-2 text-secondary font-bold bg-transparent border-0 cursor-pointer text-base underline">
          {S.login.register}
        </button>
      </p>
    </footer>
    </>
  );
}
