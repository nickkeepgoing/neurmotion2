import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BirthDatePicker, {
  ageFromBirthDate,
  birthDateFromISO,
  birthDateToISO,
  type BirthDate,
} from '../components/ui/BirthDatePicker';
import Button from '../components/ui/Button';
import { useSettings } from '../context/SettingsContext';
import { S } from '../lib/strings';

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  inputMode?: 'numeric' | 'tel' | 'email';
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-lg font-bold text-ink">
        {label}
        {required && <span className="text-risk-high-text"> *</span>}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        inputMode={inputMode}
        className="h-16 rounded-[18px] border-2 border-field bg-white px-5 text-xl font-semibold text-ink placeholder:text-muted focus:border-secondary focus:outline-none"
      />
    </label>
  );
}

/** Local account creation — profile is stored on-device only (PDPA). */
export default function Register() {
  const navigate = useNavigate();
  const { settings, update } = useSettings();
  const [firstName, setFirstName] = useState(settings.firstName ?? '');
  const [lastName, setLastName] = useState(settings.lastName ?? '');
  const [birth, setBirth] = useState<BirthDate>(
    () => (settings.birthDate && birthDateFromISO(settings.birthDate)) || { d: 1, m: 0, yBE: 2500 }
  );
  const [phone, setPhone] = useState(settings.phone ?? '');
  const [email, setEmail] = useState(settings.email ?? '');
  const [error, setError] = useState('');
  const age = ageFromBirthDate(birth);

  const submit = () => {
    if (!firstName.trim()) {
      setError(S.register.required);
      return;
    }
    const profile = {
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      displayName: firstName.trim(),
      age,
      birthDate: birthDateToISO(birth),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
    };
    if (settings.consented) {
      update(profile);
      navigate('/home');
      return;
    }
    // PDPA: defer persisting name/phone/email/DOB until consent is accepted.
    navigate('/consent', { state: { profile } });
  };

  return (
    <div className="min-h-dvh bg-bg flex flex-col px-6 pt-6 pb-8 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/login')}
          aria-label="ย้อนกลับ"
          className="flex-none w-14 h-14 rounded-full bg-white border-2 border-[#E5E0D8] flex items-center justify-center cursor-pointer"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 5l-7 7 7 7" stroke="#5A6B7A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <h1 className="mt-4 text-[28px] font-extrabold text-ink">{S.register.title}</h1>
      <p className="mt-2 text-lg font-medium text-muted-2 leading-relaxed">{S.register.subtitle}</p>

      <div className="flex flex-col gap-4 mt-5">
        <Field label={S.register.firstName} value={firstName} onChange={setFirstName} placeholder={S.register.firstNamePh} required />
        <Field label={S.register.lastName} value={lastName} onChange={setLastName} placeholder={S.register.lastNamePh} />
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-ink">
              {S.login.birthLabel}
              <span className="text-risk-high-text"> *</span>
            </span>
            <span className="text-base font-bold text-secondary bg-secondary-soft rounded-full px-3 py-0.5">{S.login.ageShow(age)}</span>
          </div>
          <BirthDatePicker value={birth} onChange={setBirth} />
        </div>
        <Field label={S.register.phone} value={phone} onChange={setPhone} placeholder={S.register.phonePh} type="tel" inputMode="tel" />
        <Field label={S.register.email} value={email} onChange={setEmail} placeholder={S.register.emailPh} type="email" inputMode="email" />
      </div>

      {error && (
        <p className="mt-4 text-lg font-bold text-risk-high-text bg-risk-high-bg rounded-2xl px-4 py-3" role="alert">
          {error}
        </p>
      )}

      <Button className="mt-6 nm-blink" onClick={submit}>
        {S.register.submit}
      </Button>
      <p className="mt-3.5 text-base font-medium text-muted-2 text-center">
        {S.register.haveAccount}{' '}
        <button onClick={() => navigate('/login')} className="text-secondary font-bold bg-transparent border-0 cursor-pointer text-base underline">
          {S.register.backToLogin}
        </button>
      </p>
    </div>
  );
}
