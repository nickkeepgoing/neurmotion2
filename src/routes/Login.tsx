import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BirthDatePicker, {
  ageFromBirthDate,
  birthDateFromISO,
  birthDateToISO,
  type BirthDate,
} from '../components/ui/BirthDatePicker';
import Button from '../components/ui/Button';
import Sheet from '../components/ui/Sheet';
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
      className={`flex items-center gap-4 w-full min-h-[88px] px-4.5 py-4 rounded-[20px] text-left cursor-pointer border-2 transition-colors ${
        selected ? 'border-primary bg-primary-soft' : 'border-line bg-white hover:border-secondary'
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

/**
 * Quiet section label. This used to be a numbered blue disc + 24px heading;
 * two of them plus the size toggle, two helper paragraphs and the type cards
 * made the first screen of the app read as a form to fill in rather than two
 * choices to make. The number carried no information the order didn't already.
 */
function SectionLabel({ text, aside }: { text: string; aside?: React.ReactNode }) {
  return (
    // nowrap + wrap so the aside drops to its own line at A++ rather than
    // squeezing the heading until Thai line-breaks mid-word
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2 mt-7 mb-3">
      <h2 className="text-2xl font-extrabold text-ink m-0 whitespace-nowrap">{text}</h2>
      {aside}
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
  const [sizeOpen, setSizeOpen] = useState(false);
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
      {/* Title row. The A/A+/A++ block used to sit full-width under the title,
          making the least important control the heaviest thing on the screen.
          It collapses to one button here and opens the same sheet pattern the
          rest of the app uses. */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h1 className="text-3xl font-extrabold text-ink m-0 whitespace-nowrap">{S.login.title}</h1>
        <button
          onClick={() => setSizeOpen(true)}
          className="flex-none min-h-14 pl-3.5 pr-4 rounded-[14px] bg-white border-2 border-field flex items-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <span className="font-num text-xl font-black text-ink leading-none">ก</span>
          <span className="text-base font-bold text-muted-2">{S.login.sizeBtn}</span>
        </button>
      </div>
      <p className="mt-1.5 text-lg font-semibold text-muted-2 leading-relaxed">{S.login.subtitle}</p>

      {/* choose user type */}
      <SectionLabel text={S.login.step1} />
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

      {/* birth date only (general); no other personal data required. The age
          reads out beside the label instead of as its own chip below — it is
          feedback on the picker, not a third thing to fill in. */}
      <SectionLabel
        text={S.login.step2}
        aside={
          <span className="flex-none text-lg font-extrabold text-secondary bg-secondary-soft rounded-full px-3.5 py-1.5 whitespace-nowrap">
            {S.login.ageShow(age)}
          </span>
        }
      />
      <BirthDatePicker value={birth} onChange={setBirth} />

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

    {sizeOpen && (
      <Sheet title={S.home.textSizeLabel} onClose={() => setSizeOpen(false)}>
        <TextSizeToggle />
      </Sheet>
    )}
    </>
  );
}
