import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, LineChart, ReferenceArea, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import Button from '../components/ui/Button';
import RiskGauge from '../components/ui/RiskGauge';
import { CheckCircle } from '../components/icons';
import { useSettings } from '../context/SettingsContext';
import { highRiskStreak, metricScores, redFlagTests, riskLevel, testStatus } from '../lib/scoring';
import { latestSession, loadSessions, trendSeries } from '../lib/storage';
import { S, thaiDate } from '../lib/strings';
import { RISK_CUTS, RISK_STREAK_DAYS } from '../lib/thresholds';
import type { RiskLevel, TestId } from '../lib/types';

/** Amber is unreadable as a thin line/dot (#F1C232 on white ≈ 1.7:1) — use a
 *  darker amber for small graphics and keep #F1C232 for large fills only. */
const TREND_MED = '#A87C00';

/** Colour for a score, matching the risk bands behind the chart. */
function bandColor(score: number): string {
  if (score <= RISK_CUTS.lowMax) return '#2E9E5B';
  if (score <= RISK_CUTS.mediumMax) return TREND_MED;
  return '#D64545';
}

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

function metricLevel(score: number): RiskLevel {
  return score <= 33 ? 'low' : score <= 66 ? 'medium' : 'high';
}

/** Full per-test detail: every metric with its status, bar, and explanation. */
function TestDetailSheet({
  test,
  metrics,
  subScore,
  age,
  onClose,
}: {
  test: TestId;
  metrics: Record<string, number>;
  subScore: number;
  age?: number;
  onClose: () => void;
}) {
  const lvl = testStatus(subScore);
  const head = STATUS_STYLE[lvl];
  const rows = metricScores(test, metrics, age).filter((m) => S.metricLabels[m.name]);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-white rounded-t-[28px] px-6 pt-6 pb-8 flex flex-col gap-3 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1.5 rounded-full bg-line self-center -mt-1 mb-1" />
        <div className="flex items-center gap-3">
          <span className="flex-none w-3.5 h-3.5 rounded-full" style={{ background: head.dot }} />
          <h2 className="text-2xl font-extrabold text-ink m-0">{S.tests[test].name}</h2>
          <span className={`ml-auto text-lg font-extrabold ${head.text}`}>{head.label}</span>
        </div>
        <p className="text-base font-semibold text-muted m-0">
          {S.result.detailSheetSub} · {S.result.metricLegend}
        </p>

        <div className="flex flex-col gap-3.5 mt-1">
          {rows.map((m) => {
            const ml = metricLevel(m.score);
            const c = ml === 'low' ? '#2E9E5B' : ml === 'medium' ? '#F1C232' : '#D64545';
            const chip = ml === 'low' ? S.result.metricGood : ml === 'medium' ? S.result.metricWatch : S.result.metricConcern;
            const chipCls = ml === 'low' ? 'text-risk-low-text bg-risk-low-bg' : ml === 'medium' ? 'text-risk-med-text bg-risk-med-bg' : 'text-risk-high-text bg-risk-high-bg';
            return (
              <div key={m.name} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-ink">{S.metricLabels[m.name]}</span>
                  <span className={`ml-auto text-base font-extrabold rounded-full px-2.5 py-0.5 ${chipCls}`}>{chip}</span>
                </div>
                <div className="h-2.5 bg-line-warm rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(m.score, 4)}%`, background: c }} />
                </div>
                {S.metricDesc[m.name] && <span className="text-base font-medium text-muted-2 leading-relaxed">{S.metricDesc[m.name]}</span>}
              </div>
            );
          })}
        </div>

        <p className="text-base font-medium text-muted text-center leading-relaxed mt-2">{S.result.testDisclaimer}</p>
        <Button variant="outline" size="md" onClick={onClose}>
          {S.result.close}
        </Button>
      </div>
    </div>
  );
}

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
  const [openTest, setOpenTest] = useState<TestId | null>(null);
  const session = useMemo(() => latestSession(), []);
  const streak = useMemo(() => highRiskStreak(loadSessions()), []);

  // one point per day, using that day's LATEST session (never the first)
  const trendData = useMemo(
    () => trendSeries(7).map((p) => ({ day: S.daysShort[new Date(p.day).getDay()], score: p.score })),
    []
  );

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
  const redFlags = redFlagTests(session.results);

  /**
   * Honest trend wording. The old version fired "แนวโน้มดีขึ้นตลอดสัปดาห์
   * เยี่ยมมาก!" on `last <= first`, so an unchanged score read as improvement
   * and a high-risk series was congratulated in green. We require a margin
   * before claiming any direction, and never call a rise "good".
   */
  const trendTone = (() => {
    if (trendData.length < 2) return { text: S.result.trendNeedMore, cls: 'text-muted-2' };
    const first = trendData[0].score;
    const last = trendData[trendData.length - 1].score;
    const delta = last - first;
    if (delta <= -8) return { text: S.result.trendGood, cls: 'text-risk-low-text' };
    if (delta >= 8) return { text: S.result.trendWorse, cls: 'text-risk-high-text' };
    return { text: S.result.trendFlat, cls: 'text-muted-2' };
  })();
  const name = settings.displayName || (settings.userType === 'patient' ? 'ผู้ป่วย' : 'ผู้ใช้');
  const care = level === 'low' ? S.result.careLow : level === 'medium' ? S.result.careMedium : S.result.careHigh;

  return (
    <div className="min-h-dvh bg-bg max-w-md mx-auto px-5.5 pt-6 pb-8 flex flex-col gap-4.5">
      {/* Header — the badge must state the ACTUAL risk level. It used to render
          green with a check mark for every level, so a high-risk result was
          crowned with a reassuring green ✓. Each level also gets its own icon
          SHAPE so the meaning survives greyscale / colour-blindness. */}
      <div className="flex flex-col gap-2.5">
        <span
          className={`self-start flex items-center gap-2 text-lg font-extrabold rounded-full px-4 py-2 ${
            level === 'low'
              ? 'bg-risk-low-bg text-risk-low-text'
              : level === 'medium'
                ? 'bg-risk-med-bg text-risk-med-text'
                : 'bg-risk-high-bg text-risk-high-text'
          }`}
        >
          {level === 'low' ? (
            <CheckCircle size={20} />
          ) : level === 'medium' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="#9C7A10" />
              <path d="M12 7v6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
              <circle cx="12" cy="16.5" r="1.4" fill="#fff" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3l9 16H3l9-16z" fill="#B23A3A" />
              <path d="M12 9.5v4.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="12" cy="16.8" r="1.3" fill="#fff" />
            </svg>
          )}
          {head.label}
        </span>
        <span className="text-base font-semibold text-muted-2">{S.result.badge} · ไม่ใช่การวินิจฉัย</span>
        <div className="flex items-baseline justify-between gap-2.5">
          <h1 className="text-3xl font-extrabold text-ink m-0">คุณ{name}</h1>
          <span className="text-base font-semibold text-muted whitespace-nowrap">{thaiDate(new Date(session.timestamp))}</span>
        </div>
      </div>

      {/* Doctor alert: high-risk streak */}
      {streak >= RISK_STREAK_DAYS && (
        <div className="flex items-start gap-3 rounded-[20px] px-4.5 py-4 bg-risk-high-bg border-2 border-[#F2D2CC]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="flex-none mt-0.5">
            <path d="M12 3l9 16H3l9-16z" stroke="#B23A3A" strokeWidth="2" strokeLinejoin="round" fill="#FBEAEA" />
            <path d="M12 9v4M12 16.5v.1" stroke="#B23A3A" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-extrabold text-risk-high-text">{S.doctorAlert.banner}</span>
            <span className="text-base font-semibold text-[#8A5A5A] leading-relaxed">{S.doctorAlert.detail(streak)}</span>
          </div>
        </div>
      )}

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
          <span className={`text-3xl font-extrabold ${head.color}`}>{head.label}</span>
        </div>
        <p className="text-lg font-semibold text-muted-2 text-center leading-relaxed whitespace-pre-line m-0 mt-1.5">{head.desc}</p>
        {level === 'low' && (
          <p className="text-base font-medium text-muted-2 text-center leading-relaxed m-0 mt-2 px-1">{S.result.lowCaveat}</p>
        )}
        {/* name the domain that triggered the red-flag override */}
        {redFlags.length > 0 && riskLevel(session.overallScore) === 'low' && (
          <p className="text-base font-semibold text-risk-med-text bg-risk-med-bg rounded-2xl px-4 py-3 leading-relaxed m-0 mt-3">
            {S.result.redFlag(redFlags.map((t) => S.tests[t].name).join(' · '))}
          </p>
        )}
      </div>

      {/* Per-test breakdown — tap a row for full detail */}
      <h2 className="text-xl font-extrabold text-ink m-0 mt-1">{S.result.detailTitle}</h2>
      <div className="flex flex-col gap-2.5 -mt-1.5">
        {TEST_ORDER.filter((t) => session.results.some((r) => r.test === t)).map((t) => {
          const r = session.results.find((x) => x.test === t)!;
          const lvl = testStatus(r.subScore);
          const st = STATUS_STYLE[lvl];
          // Key the summary off the WORST METRIC, not the aggregate sub-score.
          // Averaging can leave a test in the "low" band while one metric sits
          // at 100/100 — the row then claimed "ทุกด้านอยู่ในเกณฑ์ปกติ" while
          // its own detail sheet said that metric was abnormal.
          const worst = metricScores(t, r.metrics, settings.age).find((m) => S.metricLabels[m.name]);
          const worstLvl = worst ? metricLevel(worst.score) : 'low';
          const detail =
            worst && worstLvl !== 'low' ? S.result.mostConcern(S.metricLabels[worst.name]) : S.result.allNormalDetail;
          const detailTone = worstLvl === 'low' ? 'text-muted-2' : STATUS_STYLE[worstLvl].text;
          return (
            <button
              key={t}
              onClick={() => setOpenTest(t)}
              className="text-left bg-white rounded-2xl px-4 py-3.5 shadow-[0_2px_10px_rgba(35,58,77,.05)] flex items-center gap-3 cursor-pointer active:scale-[.99] transition-transform border-0 w-full"
            >
              <span className="flex-none w-3 h-3 rounded-full" style={{ background: st.dot }} />
              <div className="flex flex-col min-w-0">
                <span className="text-lg font-bold text-ink">{S.tests[t].name}</span>
                {detail && <span className={`text-base font-semibold ${detailTone}`}>{detail}</span>}
              </div>
              <span className={`ml-auto text-base font-bold ${st.text}`}>{st.label}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-none">
                <path d="M9 5l7 7-7 7" stroke="#8A97A3" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          );
        })}
      </div>

      {/* Trend */}
      <div className="bg-white rounded-3xl shadow-[0_4px_16px_rgba(35,58,77,.07)] p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-extrabold text-ink m-0">{S.result.trend}</h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-base font-semibold text-muted-2">
              <span className="w-3 h-3 rounded-full bg-risk-low" />
              {S.result.normalLegend}
            </span>
            <span className="flex items-center gap-1.5 text-base font-semibold text-muted-2">
              <span className="w-3 h-3 rounded-full" style={{ background: TREND_MED }} />
              {S.result.statusWatch}
            </span>
            <span className="flex items-center gap-1.5 text-base font-semibold text-muted-2">
              <span className="w-3 h-3 rounded-full bg-risk-high" />
              {S.result.riskLegend}
            </span>
          </div>
        </div>
        {/* without this a rising line reads as improvement */}
        <p className="text-base font-semibold text-muted-2 m-0 mt-1">{S.result.trendHint}</p>
        {trendData.length >= 2 ? (
          <>
            <div className="h-40 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 12, bottom: 0, left: -22 }}>
                  {/* risk bands make the legend true and the chart readable at a glance */}
                  <ReferenceArea y1={0} y2={RISK_CUTS.lowMax} fill="#E9F5EC" fillOpacity={1} />
                  <ReferenceArea y1={RISK_CUTS.lowMax} y2={RISK_CUTS.mediumMax} fill="#FBF3D9" fillOpacity={1} />
                  <ReferenceArea y1={RISK_CUTS.mediumMax} y2={100} fill="#FBEAEA" fillOpacity={1} />
                  <XAxis dataKey="day" tick={{ fontSize: 15, fontFamily: 'Noto Sans Thai', fill: '#5A6B7A' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} ticks={[0, 33, 66, 100]} tick={{ fontSize: 13, fill: '#5A6B7A' }} axisLine={false} tickLine={false} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={bandColor(trendData[trendData.length - 1].score)}
                    strokeWidth={4}
                    strokeLinecap="round"
                    dot={(props) => {
                      const { cx: dx, cy: dy, payload, index } = props as { cx: number; cy: number; payload: { score: number }; index: number };
                      return (
                        <circle key={index} cx={dx} cy={dy} r={6} fill={bandColor(payload.score)} stroke="#FFFFFF" strokeWidth={2} />
                      );
                    }}
                    activeDot={{ r: 8 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className={`text-base font-semibold m-0 mt-1.5 ${trendTone.cls}`}>{trendTone.text}</p>
          </>
        ) : (
          <p className="text-base font-semibold text-muted-2 m-0 mt-3">{S.result.trendNeedMore}</p>
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
          <span className={`text-lg font-semibold leading-relaxed ${level === 'high' ? 'text-[#2B5A7E]' : 'text-[#7A5A3A]'}`}>{care}</span>
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
      {openTest && (
        <TestDetailSheet
          test={openTest}
          metrics={session.results.find((r) => r.test === openTest)!.metrics}
          subScore={session.results.find((r) => r.test === openTest)!.subScore}
          age={settings.age}
          onClose={() => setOpenTest(null)}
        />
      )}
    </div>
  );
}
