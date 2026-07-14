import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import Button from '../components/ui/Button';
import RiskGauge from '../components/ui/RiskGauge';
import { CheckCircle } from '../components/icons';
import { useSettings } from '../context/SettingsContext';
import { testStatus } from '../lib/scoring';
import { latestSession, loadSessions } from '../lib/storage';
import { S, thaiDate } from '../lib/strings';
import type { RiskLevel, TestId } from '../lib/types';

const STATUS_STYLE: Record<RiskLevel, { dot: string; text: string; label: string }> = {
  low: { dot: '#2E9E5B', text: 'text-risk-low-text', label: S.result.statusNormal },
  medium: { dot: '#F1C232', text: 'text-risk-med-text', label: S.result.statusWatch },
  high: { dot: '#D64545', text: 'text-risk-high-text', label: S.result.statusCheck },
};

const RISK_HEAD: Record<RiskLevel, { label: string; desc: string; color: string }> = {
  low: { label: S.result.riskLow, desc: S.result.lowDesc, color: 'text-risk-low-text' },
  medium: { label: S.result.riskMedium, desc: S.result.mediumDesc, color: 'text-risk-med-text' },
  high: { label: S.result.riskHigh, desc: S.result.highDesc, color: 'text-risk-high-text' },
};

const TEST_ORDER: TestId[] = ['spiral', 'tapping', 'tremor', 'facial', 'voice'];

/** Bottom sheet with real ways to reach a doctor (demo-safe: hotline + map). */
function ConsultSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="w-full max-w-md bg-white rounded-t-[28px] px-6 pt-6 pb-8 flex flex-col gap-3.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 rounded-full bg-line self-center -mt-1 mb-1" />
        <h2 className="text-2xl font-extrabold text-ink m-0">{S.result.consult}</h2>
        <p className="text-base font-medium text-muted-2 leading-relaxed m-0">{S.result.consultDesc}</p>

        <a
          href="tel:1330"
          className="flex items-center gap-4 rounded-[20px] bg-secondary text-white px-5 h-16 no-underline shadow-[0_6px_18px_rgba(27,108,168,.3)] active:scale-[.97] transition-transform"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path
              d="M6.6 3h3l1.5 4.5-2 1.5a13 13 0 0 0 5.9 5.9l1.5-2 4.5 1.5v3c0 1.1-.9 2-2 2A17.5 17.5 0 0 1 4.6 5c0-1.1.9-2 2-2z"
              stroke="#fff"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
          <span className="flex flex-col leading-tight">
            <span className="text-xl font-extrabold">{S.result.callHotline}</span>
            <span className="text-sm font-semibold text-white/80">{S.result.callHotlineSub}</span>
          </span>
        </a>

        <a
          href="https://www.google.com/maps/search/โรงพยาบาล+ใกล้ฉัน"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-4 rounded-[20px] bg-white border-2 border-field text-ink px-5 h-16 no-underline active:scale-[.97] transition-transform"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11z" stroke="#1B6CA8" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2.5" stroke="#1B6CA8" strokeWidth="2" />
          </svg>
          <span className="flex flex-col leading-tight">
            <span className="text-xl font-extrabold text-ink">{S.result.findHospital}</span>
            <span className="text-sm font-semibold text-muted">{S.result.findHospitalSub}</span>
          </span>
        </a>

        <Button variant="outline" size="md" onClick={onClose}>
          {S.result.close}
        </Button>
      </div>
    </div>
  );
}

export default function Result() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [consultOpen, setConsultOpen] = useState(false);
  const session = useMemo(() => latestSession(), []);
  const sessions = useMemo(() => loadSessions(), []);

  const trendData = sessions.slice(-7).map((s) => ({
    day: S.daysShort[new Date(s.timestamp).getDay()],
    score: s.overallScore,
  }));

  if (!session) {
    return (
      <div className="min-h-dvh bg-bg max-w-md mx-auto px-6 pt-10 pb-8 flex flex-col items-center justify-center gap-6">
        <p className="text-xl font-semibold text-muted-2 text-center leading-relaxed">{S.result.noData}</p>
        <Button onClick={() => navigate('/home')}>{S.backHome}</Button>
      </div>
    );
  }

  const level = session.riskLevel;
  const head = RISK_HEAD[level];
  const name = settings.displayName || (settings.userType === 'patient' ? 'ผู้ป่วย' : 'ผู้ใช้');
  const care = level === 'low' ? S.result.careLow : level === 'medium' ? S.result.careMedium : S.result.careHigh;

  return (
    <div className="min-h-dvh bg-bg max-w-md mx-auto px-5.5 pt-6 pb-8 flex flex-col gap-4.5">
      {/* Header */}
      <div className="flex flex-col gap-2.5">
        <span className="self-start flex items-center gap-2 bg-risk-low-bg text-risk-low-text text-base font-extrabold rounded-full px-4 py-2">
          <CheckCircle size={18} />
          {S.result.badge}
        </span>
        <div className="flex items-baseline justify-between gap-2.5">
          <h1 className="text-[26px] font-extrabold text-ink m-0">คุณ{name}</h1>
          <span className="text-base font-semibold text-muted whitespace-nowrap">{thaiDate(new Date(session.timestamp))}</span>
        </div>
      </div>

      {/* Risk gauge */}
      <div className="bg-white rounded-3xl shadow-[0_4px_16px_rgba(35,58,77,.07)] px-5 pt-5 pb-5 flex flex-col items-center gap-1">
        <RiskGauge score={session.overallScore} level={level} />
        <div className="flex items-center gap-2.5 mt-1.5">
          {level === 'low' ? (
            <CheckCircle size={30} />
          ) : (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill={level === 'medium' ? '#F1C232' : '#D64545'} />
              <path d="M12 7v6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
              <circle cx="12" cy="16.5" r="1.5" fill="#fff" />
            </svg>
          )}
          <span className={`text-[26px] font-extrabold ${head.color}`}>{head.label}</span>
        </div>
        <p className="text-lg font-semibold text-muted-2 text-center leading-relaxed whitespace-pre-line m-0 mt-1.5">{head.desc}</p>
      </div>

      {/* Per-test breakdown */}
      <h2 className="text-xl font-extrabold text-ink m-0 mt-1">{S.result.perTest}</h2>
      <div className="flex flex-col gap-2.5 -mt-1.5">
        {TEST_ORDER.filter((t) => session.results.some((r) => r.test === t)).map((t) => {
          const r = session.results.find((x) => x.test === t)!;
          const st = STATUS_STYLE[testStatus(r.subScore)];
          return (
            <div key={t} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-[0_2px_10px_rgba(35,58,77,.05)]">
              <span className="flex-none w-3 h-3 rounded-full" style={{ background: st.dot }} />
              <span className="text-lg font-bold text-ink">{S.tests[t].name}</span>
              <span className={`ml-auto text-base font-bold ${st.text}`}>{st.label}</span>
            </div>
          );
        })}
      </div>

      {/* Trend */}
      <div className="bg-white rounded-3xl shadow-[0_4px_16px_rgba(35,58,77,.07)] p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-xl font-extrabold text-ink m-0">{S.result.trend}</h2>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-2">
              <span className="w-2.5 h-2.5 rounded-full bg-risk-low" />
              {S.result.normalLegend}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-2">
              <span className="w-2.5 h-2.5 rounded-full bg-risk-high" />
              {S.result.riskLegend}
            </span>
          </div>
        </div>
        {trendData.length >= 2 ? (
          <>
            <div className="h-36 mt-2.5">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 12, bottom: 0, left: -22 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 14, fontFamily: 'Noto Sans Thai', fill: '#8A97A3' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#8A97A3' }} axisLine={false} tickLine={false} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#2E9E5B"
                    strokeWidth={4}
                    strokeLinecap="round"
                    dot={{ r: 6, fill: '#2E9E5B', strokeWidth: 0 }}
                    activeDot={{ r: 7 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-base font-semibold text-risk-low-text m-0 mt-1.5">
              {trendData[trendData.length - 1].score <= trendData[0].score ? S.result.trendGood : S.result.trendNeedMore}
            </p>
          </>
        ) : (
          <p className="text-base font-semibold text-muted m-0 mt-3">{S.result.trendNeedMore}</p>
        )}
      </div>

      {/* Care card */}
      <div className={`flex items-start gap-3 rounded-[20px] px-4.5 py-4 ${level === 'high' ? 'bg-secondary-soft' : 'bg-primary-soft'}`}>
        {level === 'high' ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="flex-none mt-0.5">
            <path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3z" stroke="#1B6CA8" strokeWidth="2" strokeLinejoin="round" fill="#D6E7F3" />
            <path d="M12 9v4M12 16.5v.1" stroke="#1B6CA8" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="flex-none mt-0.5">
            <path
              d="M12 21s-7-4.6-9.5-9C.9 8.6 2.7 5 6.2 5c2.1 0 3.4 1.1 4.3 2.4h3c.9-1.3 2.2-2.4 4.3-2.4 3.5 0 5.3 3.6 3.7 7-2.5 4.4-9.5 9-9.5 9z"
              stroke="#E8762C"
              strokeWidth="2"
              strokeLinejoin="round"
              fill="#FCE3CC"
            />
          </svg>
        )}
        <div className="flex flex-col gap-1">
          <span className={`text-lg font-extrabold ${level === 'high' ? 'text-[#1B4E76]' : 'text-[#8C4A16]'}`}>{S.result.careTitle}</span>
          <span className={`text-[17px] font-semibold leading-relaxed ${level === 'high' ? 'text-[#2B5A7E]' : 'text-[#7A5A3A]'}`}>{care}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Button variant="secondary" onClick={() => setConsultOpen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M21 12a9 9 0 1 1-4-7.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M12 8v4l3 2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          {S.result.consult}
        </Button>
        <Button variant="outline" onClick={() => navigate('/home')}>
          {S.backHome}
        </Button>
      </div>

      <p className="text-sm font-medium text-muted text-center leading-relaxed whitespace-pre-line m-0">{S.result.disclaimer}</p>

      {consultOpen && <ConsultSheet onClose={() => setConsultOpen(false)} />}
    </div>
  );
}
