import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TextSizeToggle from '../components/ui/TextSizeToggle';
import { ChartIcon, CheckCircle, FaceIcon, SpiralIcon, TapIcon, TremorIcon, VoiceIcon } from '../components/icons';
import { useSettings } from '../context/SettingsContext';
import { highRiskStreak } from '../lib/scoring';
import { completedToday, eraseAllData, loadSessions, startRetestRound } from '../lib/storage';
import { RISK_STREAK_DAYS } from '../lib/thresholds';
import { S, thaiDateLong } from '../lib/strings';
import type { TestId } from '../lib/types';

const TESTS: { id: TestId; icon: React.ReactNode }[] = [
  { id: 'spiral', icon: <SpiralIcon /> },
  { id: 'tapping', icon: <TapIcon /> },
  { id: 'tremor', icon: <TremorIcon /> },
  { id: 'facial', icon: <FaceIcon /> },
  { id: 'voice', icon: <VoiceIcon /> },
];

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/** Local-date key that matches storage's UTC-based ISO keys for UTC+7 users. */
function dayKey(y: number, m: number, d: number): string {
  return new Date(y, m, d, 12).toISOString().slice(0, 10);
}

/** Month calendar bottom sheet — green dot on days with a completed session. */
function CalendarSheet({ onClose }: { onClose: () => void }) {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const doneDays = useMemo(() => new Set(loadSessions().map((s) => s.timestamp.slice(0, 10))), []);

  const startDow = new Date(ym.y, ym.m, 1).getDay();
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const todayKey = dayKey(now.getFullYear(), now.getMonth(), now.getDate());
  const shift = (d: number) => {
    const next = new Date(ym.y, ym.m + d, 1);
    setYm({ y: next.getFullYear(), m: next.getMonth() });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-white rounded-t-[28px] px-6 pt-6 pb-8 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1.5 rounded-full bg-line self-center -mt-1" />
        <div className="flex items-center justify-between">
          <button onClick={() => shift(-1)} aria-label="เดือนก่อนหน้า" className="min-w-14 min-h-14 rounded-full border-2 border-field bg-white flex items-center justify-center cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="#5A6B7A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span className="text-xl font-extrabold text-ink">
            {THAI_MONTHS[ym.m]} {ym.y + 543}
          </span>
          <button onClick={() => shift(1)} aria-label="เดือนถัดไป" className="min-w-14 min-h-14 rounded-full border-2 border-field bg-white flex items-center justify-center cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="#5A6B7A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {S.daysShort.map((d) => (
            <span key={d} className="text-sm font-bold text-muted py-1">{d}</span>
          ))}
          {Array.from({ length: startDow }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            const key = dayKey(ym.y, ym.m, d);
            const isDone = doneDays.has(key);
            const isToday = key === todayKey;
            return (
              <div
                key={d}
                className={`relative h-12 rounded-[10px] flex items-center justify-center text-base font-bold ${
                  isDone ? 'bg-risk-low-bg text-risk-low-text' : 'bg-[#FAF6EF] text-muted-2'
                } ${isToday ? 'ring-2 ring-primary' : ''}`}
              >
                {d}
                {isDone && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-risk-low" />}
              </div>
            );
          })}
        </div>
        <p className="text-sm font-semibold text-muted text-center m-0">{S.home.calendarHint}</p>
      </div>
    </div>
  );
}

/** "..." menu: text-size + voice-guidance settings, tucked away per design. */
function OptionsMenu({ onClose }: { onClose: () => void }) {
  const { settings, update } = useSettings();
  const navigate = useNavigate();
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-14 z-50 w-72 bg-white rounded-[20px] shadow-[0_10px_30px_rgba(35,58,77,.18)] border border-line p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-base font-bold text-ink">{S.home.textSizeLabel}</span>
          <TextSizeToggle />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-bold text-ink">{S.home.voiceLabel}</span>
          <button
            onClick={() => update({ voiceOn: !settings.voiceOn })}
            aria-pressed={settings.voiceOn}
            className={`min-h-14 px-5 rounded-full font-extrabold text-base cursor-pointer border-2 transition-colors ${
              settings.voiceOn ? 'bg-secondary border-secondary text-white' : 'bg-white border-field text-muted-2'
            }`}
          >
            {settings.voiceOn ? S.home.on : S.home.off}
          </button>
        </div>
        {/* PDPA: makes the consent screen's "withdraw at any time" promise real.
            (Also the clean reset between demo users.) */}
        <button
          onClick={() => {
            if (confirm(S.home.eraseConfirm)) {
              eraseAllData();
              window.location.href = '/';
            }
          }}
          className="text-left min-h-14 text-base font-bold text-risk-high-text bg-transparent border-0 border-t border-line pt-3 cursor-pointer"
        >
          {S.home.eraseLabel}
        </button>
        {/* Admin is an internal tool — not shown to patients. Reachable at /admin. */}
        {import.meta.env.DEV && (
          <button
            onClick={() => navigate('/admin')}
            className="text-left min-h-14 text-base font-bold text-secondary bg-transparent border-0 border-t border-line pt-3 cursor-pointer"
          >
            {S.admin.openAdmin}
          </button>
        )}
      </div>
    </>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const done = useMemo(() => completedToday(), []);
  const doneCount = done.size;
  const total = TESTS.length;
  const nextTest = TESTS.find((t) => !done.has(t.id));

  // which of the last 7 days have a session (for the weekly strip)
  const week = useMemo(() => {
    const sessions = loadSessions();
    const days: { label: string; state: 'done' | 'missed' | 'today' }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const has = sessions.some((s) => s.timestamp.slice(0, 10) === key);
      days.push({
        label: S.daysShort[d.getDay()],
        state: i === 0 && !has ? 'today' : has ? 'done' : 'missed',
      });
    }
    return days;
  }, []);
  const weekDone = week.filter((d) => d.state === 'done').length;
  const streak = useMemo(() => highRiskStreak(loadSessions()), []);

  const name = settings.displayName || (settings.userType === 'patient' ? 'ผู้ป่วย' : 'ผู้ใช้');

  return (
    <div className="min-h-dvh bg-bg max-w-md mx-auto px-5.5 pt-6 pb-10 flex flex-col gap-4.5">
      {/* Greeting + options menu */}
      <div className="relative flex items-center gap-3.5">
        <div className="flex-none w-14 h-14 rounded-full bg-primary-softer flex items-center justify-center">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="#E8762C" strokeWidth="2.4" />
            <path d="M4 20c0-3.3 3.6-5.5 8-5.5s8 2.2 8 5.5" stroke="#E8762C" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-2xl font-extrabold text-ink truncate">{S.home.hello(name)}</span>
          <span className="text-base font-semibold text-muted">{thaiDateLong(new Date())}</span>
        </div>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={S.home.menuLabel}
          className="ml-auto flex-none w-12 h-12 rounded-[12px] bg-white border-2 border-field flex items-center justify-center cursor-pointer"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="5" cy="12" r="2" fill="#5A6B7A" />
            <circle cx="12" cy="12" r="2" fill="#5A6B7A" />
            <circle cx="19" cy="12" r="2" fill="#5A6B7A" />
          </svg>
        </button>
        {menuOpen && <OptionsMenu onClose={() => setMenuOpen(false)} />}
      </div>

      {/* Doctor alert: high-risk for several consecutive days */}
      {streak >= RISK_STREAK_DAYS && (
        <button
          onClick={() => navigate('/result')}
          className="text-left flex items-start gap-3 rounded-[20px] px-4.5 py-4 bg-risk-high-bg border-2 border-[#F2D2CC] cursor-pointer active:scale-[.99] transition-transform"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="flex-none mt-0.5">
            <path d="M12 3l9 16H3l9-16z" stroke="#B23A3A" strokeWidth="2" strokeLinejoin="round" fill="#FBEAEA" />
            <path d="M12 9v4M12 16.5v.1" stroke="#B23A3A" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <span className="flex flex-col gap-0.5">
            <span className="text-lg font-extrabold text-risk-high-text">{S.doctorAlert.banner}</span>
            <span className="text-base font-semibold text-[#8A5A5A] leading-relaxed">{S.doctorAlert.detail(streak)}</span>
          </span>
        </button>
      )}

      {/* Daily Quest card */}
      <div className="rounded-3xl p-5 flex flex-col gap-3 bg-[linear-gradient(135deg,#E8762C,#D9681F)] shadow-[0_8px_22px_rgba(232,118,44,.32)]">
        <div className="flex items-center justify-between">
          <span className="text-xl font-extrabold text-white">{S.home.questTitle}</span>
          <span className="text-base font-extrabold text-white bg-white/20 rounded-full px-3.5 py-1.5">
            {S.home.questProgress(doneCount, total)}
          </span>
        </div>
        <p className="text-lg font-semibold text-white/90 leading-relaxed m-0">
          {doneCount >= total ? S.home.questDone : S.home.questDesc(total - doneCount)}
        </p>
        <div className="h-3.5 bg-white/25 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${(doneCount / total) * 100}%` }} />
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => (nextTest ? navigate(`/test/${nextTest.id}`) : navigate('/result'))}
            className="h-12 px-5.5 rounded-[14px] bg-white text-primary-dark text-lg font-extrabold cursor-pointer border-0 active:scale-95 transition-transform nm-blink"
          >
            {nextTest ? S.home.continueBtn : S.home.viewResult}
          </button>
          {doneCount > 0 && (
            <button
              onClick={() => {
                startRetestRound(); // fresh round → chaining walks all 5 again
                navigate('/test/spiral');
              }}
              className="h-12 px-5 rounded-[14px] bg-transparent text-white text-lg font-bold cursor-pointer border-2 border-white/70 active:scale-95 transition-transform"
            >
              {S.home.retestAll}
            </button>
          )}
        </div>
      </div>

      {/* Test tiles */}
      <h2 className="text-xl font-extrabold text-ink mt-1 mb-0">{S.home.testsTitle}</h2>
      <div className="grid grid-cols-2 gap-3 -mt-1.5">
        {TESTS.map((t) => {
          const isDone = done.has(t.id);
          return (
            <button
              key={t.id}
              onClick={() => navigate(`/test/${t.id}`)}
              className={`bg-white rounded-[20px] p-4 flex flex-col gap-2 text-left cursor-pointer shadow-[0_3px_12px_rgba(35,58,77,.06)] border-2 active:scale-[.97] transition-transform ${
                isDone ? 'border-transparent' : 'border-[#F0C39E]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-[46px] h-[46px] rounded-[14px] bg-primary-soft flex items-center justify-center">{t.icon}</div>
                {isDone ? (
                  <CheckCircle />
                ) : (
                  <span className="text-base font-bold text-[#B27A2E] bg-[#FDF3E7] rounded-full px-2.5 py-1">{S.home.pending}</span>
                )}
              </div>
              <span className="text-lg font-extrabold text-ink">{S.tests[t.id].name}</span>
              <span className={`text-sm font-semibold ${isDone ? 'text-risk-low-text' : 'text-muted'}`}>
                {isDone ? S.home.doneRedo : S.home.aboutMin}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => navigate('/result')}
          className="bg-secondary-soft rounded-[20px] p-4 flex flex-col gap-2 items-center justify-center border-2 border-dashed border-[#9DBBD3] cursor-pointer active:scale-[.97] transition-transform"
        >
          <ChartIcon />
          <span className="text-lg font-extrabold text-secondary text-center">{S.home.viewResult}</span>
        </button>
      </div>

      {/* Weekly summary + calendar */}
      <div className="bg-white rounded-3xl shadow-[0_4px_16px_rgba(35,58,77,.07)] px-5 py-4.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-xl font-extrabold text-ink m-0">{S.home.weekTitle}</h2>
          <div className="flex items-baseline gap-3">
            <span className="text-base font-bold text-risk-low-text">{S.home.weekDone(weekDone, 7)}</span>
            <button onClick={() => setCalOpen(true)} className="min-h-14 px-2 text-base font-bold text-secondary bg-transparent border-0 cursor-pointer underline">
              {S.home.calendar}
            </button>
          </div>
        </div>
        <div className="flex gap-2 mt-3.5">
          {week.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`w-full h-11 rounded-[10px] ${
                  d.state === 'done' ? 'bg-risk-low' : d.state === 'today' ? 'bg-white border-2 border-dashed border-[#D8C9B4]' : 'bg-line-warm'
                }`}
              />
              <span className={`text-base ${d.state === 'today' ? 'font-bold text-primary' : 'font-semibold text-muted'}`}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {calOpen && <CalendarSheet onClose={() => setCalOpen(false)} />}
    </div>
  );
}
