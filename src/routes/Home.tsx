import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import TabBar from '../components/TabBar';
import Sheet from '../components/ui/Sheet';
import { CheckCircle, FaceIcon, SpiralIcon, TapIcon, TremorIcon, VoiceIcon } from '../components/icons';
import { useSettings } from '../context/SettingsContext';
import { highRiskStreak } from '../lib/scoring';
import { completedToday, dailyLatestSessions, latestSession, loadSessions, startRetestRound } from '../lib/storage';
import { RISK_STREAK_DAYS } from '../lib/thresholds';
import { S, thaiDate } from '../lib/strings';
import type { RiskLevel, TestId } from '../lib/types';

const TESTS: { id: TestId; icon: React.ReactNode }[] = [
  { id: 'spiral', icon: <SpiralIcon /> },
  { id: 'tapping', icon: <TapIcon /> },
  { id: 'tremor', icon: <TremorIcon /> },
  { id: 'facial', icon: <FaceIcon /> },
  { id: 'voice', icon: <VoiceIcon /> },
];

/** Risk styling for the latest-result card — colour always paired with a word. */
const RISK_LABEL: Record<RiskLevel, string> = {
  low: S.result.riskLow,
  medium: S.result.riskMedium,
  high: S.result.riskHigh,
};
const RISK_CHIP: Record<RiskLevel, string> = {
  low: 'text-risk-low-text bg-risk-low-bg',
  medium: 'text-risk-med-text bg-risk-med-bg',
  high: 'text-risk-high-text bg-risk-high-bg',
};
const RISK_TEXT: Record<RiskLevel, string> = {
  low: 'text-risk-low-text',
  medium: 'text-risk-med-text',
  high: 'text-risk-high-text',
};

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/** Local-date key that matches storage's UTC-based ISO keys for UTC+7 users. */
function dayKey(y: number, m: number, d: number): string {
  return new Date(y, m, d, 12).toISOString().slice(0, 10);
}

/** Month calendar bottom sheet — green fill on days with a completed session. */
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
    <Sheet title={S.home.calendarTitle} onClose={onClose}>
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
            // only days that mean something get a fill — giving all 31 cells a
            // beige box turned the month into a wall of chips with no figure
            <div
              key={d}
              className={`relative h-12 rounded-[10px] flex items-center justify-center text-base font-bold ${
                isDone ? 'bg-risk-low-bg text-risk-low-text' : 'text-muted-2'
              } ${isToday ? 'ring-2 ring-primary' : ''}`}
            >
              {d}
              {isDone && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-risk-low" />}
            </div>
          );
        })}
      </div>
      <p className="text-sm font-semibold text-muted text-center m-0">{S.home.calendarHint}</p>
    </Sheet>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { settings } = useSettings();
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

  // latest result + change against the previous *day* (comparing against the
  // previous session would show noise between two rounds on the same morning)
  const latest = useMemo(() => latestSession(), []);
  const delta = useMemo(() => {
    const days = dailyLatestSessions();
    if (days.length < 2) return null;
    return days[days.length - 1].overallScore - days[days.length - 2].overallScore;
  }, []);

  // Only a real name goes on screen. Signing in as a general user never asks
  // for one, and filling the gap with "ผู้ใช้" / "ผู้ป่วย" greeted people by
  // their account type — colder than not naming them at all.
  const name = settings.displayName?.trim();

  return (
    <>
      {/* pb clears the fixed tab bar */}
      <div className="min-h-dvh bg-bg max-w-md mx-auto px-5 pt-6 pb-32 flex flex-col gap-4">
        {/* Greeting. The settings gear that used to sit here moved to the tab
            bar, which frees the row for the name to run full width. */}
        <div className="flex items-center gap-3.5">
          <Avatar src={settings.avatar} size={56} />
          <div className="flex flex-col min-w-0">
            {name ? (
              <>
                <span className="text-base font-semibold text-muted leading-snug">{S.home.greeting}</span>
                <span className="text-2xl font-extrabold text-ink leading-tight break-words">{name}</span>
              </>
            ) : (
              <span className="text-2xl font-extrabold text-ink leading-tight">{S.home.greeting}</span>
            )}
            <span className="text-base font-semibold text-muted leading-snug mt-0.5">{thaiDate(new Date())}</span>
          </div>
        </div>

        {/* Doctor alert: high-risk for several consecutive days */}
        {streak >= RISK_STREAK_DAYS && (
          <button
            onClick={() => navigate('/result')}
            className="text-left flex items-start gap-3 rounded-card px-4.5 py-4 bg-risk-high-bg border-2 border-[#F2D2CC] cursor-pointer active:scale-[.99] transition-transform"
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

        {/* Today's mission — the one card carrying the primary action */}
        <div className="rounded-card p-5 flex flex-col gap-3.5 bg-[linear-gradient(135deg,#E8762C,#D9681F)] shadow-raised">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <span className="text-xl font-extrabold text-white whitespace-nowrap">{S.home.questTitle}</span>
            <span className="flex-none text-base font-extrabold text-white bg-white/20 rounded-full px-3.5 py-1.5 whitespace-nowrap">
              {S.home.questProgress(doneCount, total)}
            </span>
          </div>
          <p className="text-lg font-semibold text-white/90 leading-relaxed m-0">
            {doneCount >= total ? S.home.questDone : S.home.questDesc(total - doneCount)}
          </p>
          <div className="h-3 bg-white/25 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${(doneCount / total) * 100}%` }} />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => (nextTest ? navigate(`/test/${nextTest.id}`) : navigate('/result'))}
              className="min-h-14 px-5.5 rounded-ctl bg-white text-primary-dark text-lg font-extrabold cursor-pointer border-0 active:scale-95 transition-transform nm-blink"
            >
              {nextTest ? S.home.continueBtn : S.home.viewResult}
            </button>
            {doneCount > 0 && (
              <button
                onClick={() => {
                  startRetestRound(); // fresh round → chaining walks all 5 again
                  navigate('/test/spiral');
                }}
                className="min-h-14 px-5 rounded-ctl bg-transparent text-white text-lg font-bold cursor-pointer border-2 border-white/70 active:scale-95 transition-transform"
              >
                {S.home.retestAll}
              </button>
            )}
          </div>
        </div>

        {/* Latest screening result. The dashboard used to show only progress —
            the actual score lived one tap away inside /result. */}
        {latest ? (
          <button
            onClick={() => navigate('/result')}
            className="text-left bg-white rounded-card shadow-card px-5 py-4.5 flex flex-col gap-3 border-0 cursor-pointer active:scale-[.99] transition-transform"
          >
            {/* nowrap + flex-wrap: at A++ the chip drops to its own line instead
                of squeezing the heading until Thai line-breaks mid-word */}
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <h2 className="text-xl font-extrabold text-ink m-0 whitespace-nowrap">{S.home.latestTitle}</h2>
              <span className={`flex-none text-base font-extrabold rounded-full px-3.5 py-1.5 ${RISK_CHIP[latest.riskLevel]}`}>
                {RISK_LABEL[latest.riskLevel]}
              </span>
            </div>
            <div className="flex items-end gap-2.5">
              <span className={`font-num text-num-lg font-black leading-none ${RISK_TEXT[latest.riskLevel]}`}>
                {latest.overallScore}
              </span>
              <span className="text-sm font-semibold text-muted leading-snug pb-1">{S.home.latestUnit}</span>
            </div>
            {delta !== null && (
              <span
                className={`self-start text-base font-bold rounded-full px-3 py-1 ${
                  delta < 0 ? 'text-risk-low-text bg-risk-low-bg' : delta > 0 ? 'text-risk-high-text bg-risk-high-bg' : 'text-muted bg-line-warm'
                }`}
              >
                {delta < 0 ? S.home.latestBetter(-delta) : delta > 0 ? S.home.latestWorse(delta) : S.home.latestSame}
              </span>
            )}
            <span className="text-base font-semibold text-muted border-t border-line pt-2.5">
              {thaiDate(new Date(latest.timestamp))} · {S.home.latestFrom(latest.results.length)}
            </span>
          </button>
        ) : (
          <div className="bg-white rounded-card shadow-card px-5 py-4.5 flex flex-col gap-1">
            <h2 className="text-xl font-extrabold text-ink m-0">{S.home.latestNoneTitle}</h2>
            <p className="text-base font-semibold text-muted leading-relaxed m-0">{S.home.latestNoneDesc}</p>
          </div>
        )}

        {/* Tests. A 2-column grid left an orphan sixth cell and squeezed each
            Thai name onto two lines; a list gives every row one line, a bigger
            target, and room for its status. */}
        <h2 className="text-xl font-extrabold text-ink mt-1 mb-0">{S.home.testsTitle}</h2>
        <div className="flex flex-col gap-2.5 -mt-1.5">
          {TESTS.map((t) => {
            const isDone = done.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => navigate(`/test/${t.id}`)}
                className="w-full bg-white rounded-tile shadow-card px-4 py-3.5 flex items-center gap-3.5 text-left cursor-pointer border-0 active:scale-[.99] transition-transform"
              >
                <span className="flex-none w-[52px] h-[52px] rounded-ctl bg-primary-soft flex items-center justify-center">
                  {t.icon}
                </span>
                <span className="flex flex-col min-w-0 gap-0.5">
                  <span className="text-lg font-extrabold text-ink">{S.tests[t.id].name}</span>
                  <span className={`text-base font-semibold ${isDone ? 'text-risk-low-text' : 'text-muted'}`}>
                    {isDone ? S.home.doneRedo : S.home.aboutMin}
                  </span>
                </span>
                <span className="ml-auto flex-none">
                  {isDone ? (
                    <CheckCircle />
                  ) : (
                    <span className="text-base font-bold text-[#B27A2E] bg-[#FDF3E7] rounded-full px-3 py-1.5 whitespace-nowrap">
                      {S.home.pending}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Weekly summary + calendar */}
        <div className="bg-white rounded-card shadow-card px-5 py-4.5">
          {/* Title, count and calendar link used to share one baseline row; at
              390px all three wrapped into a tangle. */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <h2 className="text-xl font-extrabold text-ink m-0 whitespace-nowrap">{S.home.weekTitle}</h2>
            <button
              onClick={() => setCalOpen(true)}
              className="flex-none min-h-14 pl-3.5 pr-4 rounded-ctl bg-secondary-soft border-0 flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="16" rx="3" stroke="#1B6CA8" strokeWidth="2" />
                <path d="M3 10h18M8 3v4M16 3v4" stroke="#1B6CA8" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-base font-bold text-secondary">{S.home.calendar}</span>
            </button>
          </div>
          <p className="text-base font-bold text-risk-low-text mt-1 mb-0">{S.home.weekDone(weekDone, 7)}</p>
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
      <TabBar />
    </>
  );
}
