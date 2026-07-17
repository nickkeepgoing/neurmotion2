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
        <span className="text-[22px] font-extrabold text-ink">{title}</span>
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
    update({
      userType,
      age,
      birthDate: birthDateToISO(birth),
      nationalId: userType === 'patient' && nid.trim() ? nid.trim() : undefined,
    });
    navigate(settings.consented ? '/home' : '/consent');
  };

  return (
    <div className="min-h-dvh bg-bg flex flex-col px-6 pt-6 pb-8 max-w-md mx-auto">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[28px] font-extrabold text-ink">{S.login.title}</h1>
        <TextSizeToggle />
      </div>
      <p className="mt-2 text-lg font-medium text-muted-2">{S.login.subtitle}</p>

      <div className="flex flex-col gap-3.5 mt-4.5">
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

      {/* general: birth date only — no other personal data required */}
      <div className="flex flex-col gap-2 mt-6">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold text-ink">{S.login.birthLabel}</span>
          <span className="text-base font-bold text-secondary bg-secondary-soft rounded-full px-3 py-0.5">{S.login.ageShow(age)}</span>
        </div>
        <BirthDatePicker value={birth} onChange={setBirth} />
      </div>

      {/* patient: national ID (full patient system is future work) */}
      {userType === 'patient' && (
        <label className="flex flex-col gap-2 mt-4">
          <span className="text-lg font-bold text-ink">{S.login.nidLabel}</span>
          <input
            value={nid}
            onChange={(e) => setNid(e.target.value.replace(/\D/g, '').slice(0, 13))}
            placeholder={S.login.nidPlaceholder}
            inputMode="numeric"
            className="h-16 rounded-[18px] border-2 border-field bg-white px-5 text-xl font-semibold text-ink placeholder:text-muted focus:border-secondary focus:outline-none tracking-wider"
          />
          <span className="text-sm font-medium text-muted leading-relaxed">{S.login.nidNote}</span>
        </label>
      )}

      <Button className="mt-7 nm-blink" onClick={start}>
        {S.start}
      </Button>
      <p className="mt-3.5 text-base font-medium text-muted-2 text-center">
        {S.login.noAccount}{' '}
        <button onClick={() => navigate('/register')} className="text-secondary font-bold bg-transparent border-0 cursor-pointer text-base underline">
          {S.login.register}
        </button>
      </p>
    </div>
  );
}
