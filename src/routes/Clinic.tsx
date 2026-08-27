import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, Cell, Line, LineChart, ReferenceArea, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import Sheet from '../components/ui/Sheet';
import { RISK_CUTS } from '../lib/thresholds';
import {
  cohortStats,
  ensureCohort,
  generateCohort,
  relativeThaiTime,
  saveCohort,
  setFollowedUp,
  trendOf,
  type DemoCohort,
  type DemoPatient,
} from '../lib/clinicDemo';
import { S } from '../lib/strings';
import type { RiskLevel, TestId } from '../lib/types';

const RISK_LABEL: Record<RiskLevel, string> = { low: 'เสี่ยงต่ำ', medium: 'ปานกลาง', high: 'เสี่ยงสูง' };
const RISK_DOT: Record<RiskLevel, string> = { low: 'bg-risk-low', medium: 'bg-risk-med', high: 'bg-risk-high' };
const RISK_CHIP: Record<RiskLevel, string> = {
  low: 'text-risk-low-text bg-risk-low-bg',
  medium: 'text-risk-med-text bg-risk-med-bg',
  high: 'text-risk-high-text bg-risk-high-bg',
};
const RISK_HEX: Record<RiskLevel, string> = { low: '#2E9E5B', medium: '#F1C232', high: '#D64545' };

/**
 * The clinician view is the one screen in this app that is NOT elderly-first —
 * it is for staff on a desktop, so it uses a denser scale, as the design
 * handoff specifies. It stays fully usable on a phone because a community
 * health worker may only have one.
 */
function Kpi({ value, label, sub, tone }: { value: string | number; label: string; sub?: string; tone?: RiskLevel }) {
  return (
    <div className="bg-white rounded-tile shadow-card px-4 py-3.5 flex flex-col gap-1 min-w-0">
      <span className="text-[13px] font-bold text-muted leading-snug">{label}</span>
      <span className={`font-num text-[28px] font-black leading-none ${tone ? `text-risk-${tone === 'medium' ? 'med' : tone}-text` : 'text-ink'}`}>
        {value}
      </span>
      {sub && <span className="text-[12px] font-semibold text-muted leading-snug">{sub}</span>}
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-card shadow-card px-4 py-4 flex flex-col gap-3 min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-[15px] font-extrabold text-ink m-0 whitespace-nowrap">{title}</h2>
        {hint && <span className="text-[12px] font-semibold text-muted">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

/** Coloured dot + word — colour never carries meaning on its own. */
function LevelChip({ level }: { level: RiskLevel }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-extrabold whitespace-nowrap ${RISK_CHIP[level]}`}>
      <span className={`w-2 h-2 rounded-full ${RISK_DOT[level]}`} />
      {RISK_LABEL[level]}
    </span>
  );
}

function TrendMark({ p }: { p: DemoPatient }) {
  const t = trendOf(p);
  const map = {
    worse: { icon: '▲', cls: 'text-risk-high-text', label: S.clinic.trendWorse },
    better: { icon: '▼', cls: 'text-risk-low-text', label: S.clinic.trendBetter },
    flat: { icon: '—', cls: 'text-muted', label: S.clinic.trendFlat },
  }[t];
  return (
    <span className={`inline-flex items-center gap-1 text-[12.5px] font-bold whitespace-nowrap ${map.cls}`}>
      <span className="font-num">{map.icon}</span>
      {map.label}
    </span>
  );
}

/** Detail panel — a sheet on phones, a side drawer on desktop. */
function Detail({ p, onClose, onClaim }: { p: DemoPatient; onClose: () => void; onClaim: () => void }) {
  const data = p.history.map((h) => ({ ...h, d: h.day.slice(8) }));
  return (
    <Sheet title={S.clinic.detailTitle} onClose={onClose}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-num text-2xl font-black text-ink">{p.code}</span>
          <span className="text-base font-semibold text-muted">{S.clinic.detailAge(p.age)}</span>
        </div>
        <LevelChip level={p.level} />
      </div>

      {p.streak >= 2 && (
        <div className="rounded-ctl bg-risk-high-bg px-3.5 py-2.5 text-base font-bold text-risk-high-text">
          {S.clinic.streakDays(p.streak)}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-base font-extrabold text-ink">{S.clinic.detailHistory}</span>
        {/* no negative margin here: inside the narrower sheet it pulled the
            Y-axis labels off the left edge and clipped them */}
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
              <ReferenceArea y1={0} y2={RISK_CUTS.lowMax} fill="#E9F5EC" />
              <ReferenceArea y1={RISK_CUTS.lowMax} y2={RISK_CUTS.mediumMax} fill="#FBF3D9" />
              <ReferenceArea y1={RISK_CUTS.mediumMax} y2={100} fill="#FBEAEA" />
              <XAxis dataKey="d" tick={{ fontSize: 11, fill: '#64727E' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} width={36} tick={{ fontSize: 11, fill: '#64727E' }} axisLine={false} tickLine={false} />
              <Line type="monotone" dataKey="score" stroke="#BC5411" strokeWidth={2.5} dot={{ r: 3, fill: '#BC5411' }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-base font-extrabold text-ink">{S.clinic.detailTests}</span>
        <div className="flex flex-col gap-1.5">
          {(['spiral', 'tapping', 'tremor', 'facial', 'voice'] as TestId[]).map((t) => {
            const v = p.subScores[t];
            return (
              <div key={t} className="flex items-center gap-3 border-b border-line pb-1.5 last:border-b-0">
                <span className="text-base font-bold text-ink flex-none w-[130px]">{S.tests[t].name}</span>
                {v === undefined ? (
                  <span className="text-base font-semibold text-muted">{S.clinic.detailNotDone}</span>
                ) : (
                  <>
                    <div className="flex-1 h-2.5 rounded-full bg-line-warm overflow-hidden min-w-0">
                      <div className="h-full rounded-full" style={{ width: `${v}%`, background: RISK_HEX[v > RISK_CUTS.mediumMax ? 'high' : v > RISK_CUTS.lowMax ? 'medium' : 'low'] }} />
                    </div>
                    <span className="font-num text-base font-extrabold text-ink flex-none w-8 text-right">{v}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onClaim}
        className={`w-full min-h-14 rounded-ctl text-lg font-extrabold border-0 cursor-pointer ${
          p.followedUp ? 'bg-risk-low-bg text-risk-low-text' : 'bg-secondary text-white'
        }`}
      >
        {p.followedUp ? `✓ ${S.clinic.claimed}` : S.clinic.claim}
      </button>
    </Sheet>
  );
}

export default function Clinic() {
  const navigate = useNavigate();
  const [cohort, setCohort] = useState<DemoCohort>(() => ensureCohort());
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [open, setOpen] = useState<string | null>(null);

  const stats = useMemo(() => cohortStats(cohort), [cohort]);

  // the table is for triage, so it only lists cases that actually need it
  const rows = useMemo(() => {
    const needsAttention = cohort.patients.filter((p) => p.level !== 'low');
    if (filter === 'pending') return needsAttention.filter((p) => !p.followedUp);
    if (filter === 'done') return needsAttention.filter((p) => p.followedUp);
    return needsAttention;
  }, [cohort, filter]);

  const selected = open ? cohort.patients.find((p) => p.code === open) ?? null : null;

  const claim = (code: string) => {
    const next = setFollowedUp(code, !cohort.patients.find((p) => p.code === code)?.followedUp);
    if (next) setCohort({ ...next });
  };

  const dist = (['low', 'medium', 'high'] as RiskLevel[]).map((l) => ({
    level: l, label: RISK_LABEL[l], n: stats.byLevel[l],
    pct: Math.round((stats.byLevel[l] / (stats.total || 1)) * 100),
  }));

  return (
    <div className="min-h-dvh bg-[#F4F5F7]">
      {/* top bar — this screen is for staff, so it does not use the patient AppBar */}
      <header className="sticky top-0 z-30 bg-white border-b border-line px-4 py-3">
        <div className="max-w-[1180px] mx-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            onClick={() => navigate('/settings')}
            className="flex-none min-h-11 pl-2.5 pr-3.5 rounded-ctl border border-line bg-white flex items-center gap-1.5 cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 5l-7 7 7 7" stroke="#5A6B7A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[13.5px] font-bold text-muted-2">{S.back}</span>
          </button>
          <div className="flex flex-col min-w-0">
            <h1 className="text-[17px] font-extrabold text-ink m-0 leading-tight">{S.clinic.title}</h1>
            <span className="text-[12.5px] font-semibold text-muted">{S.clinic.subtitle}</span>
          </div>
          <button
            onClick={() => { const c = generateCohort(42, Date.now() % 100000); saveCohort(c); setCohort(c); setOpen(null); }}
            className="ml-auto flex-none min-h-11 px-3.5 rounded-ctl border border-line bg-white text-[13px] font-bold text-secondary cursor-pointer"
          >
            {S.clinic.regenerate}
          </button>
        </div>
      </header>

      <div className="max-w-[1180px] mx-auto px-4 py-4 flex flex-col gap-4">
        {/* PDPA: nobody may mistake this for real patients */}
        <div className="rounded-tile bg-med-bg border-l-4 border-[#E0B93A] px-4 py-3 flex items-start gap-2.5" style={{ background: '#FBF3D9' }}>
          <span className="flex-none font-num text-[17px] leading-none mt-0.5">⚠</span>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[13.5px] font-extrabold text-[#9C7A10]">{S.clinic.demoBanner}</span>
            <span className="text-[12.5px] font-semibold text-[#7A6210] leading-relaxed">{S.clinic.demoBannerDesc}</span>
          </div>
        </div>

        {/* KPIs — 2 across on phones, 4 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi value={stats.total} label={S.clinic.kpiTotal} sub={`${S.clinic.kpiWeek} ${stats.week}`} />
          <Kpi value={stats.today} label={S.clinic.kpiToday} />
          <Kpi value={stats.highCount} label={S.clinic.kpiHigh} sub={S.clinic.kpiUnclaimed(stats.unclaimed)} tone="high" />
          <Kpi value={stats.meanScore} label={S.clinic.kpiMean} sub={S.clinic.trendHint} />
        </div>

        {/* charts: stacked on phones, 3 across on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title={S.clinic.trendTitle} hint={S.clinic.trendHint}>
            <div className="h-[160px] -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trend.map((t) => ({ ...t, d: t.day.slice(8) }))} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                  <ReferenceArea y1={0} y2={RISK_CUTS.lowMax} fill="#E9F5EC" />
                  <ReferenceArea y1={RISK_CUTS.lowMax} y2={RISK_CUTS.mediumMax} fill="#FBF3D9" />
                  <ReferenceArea y1={RISK_CUTS.mediumMax} y2={100} fill="#FBEAEA" />
                  <XAxis dataKey="d" tick={{ fontSize: 11, fill: '#64727E' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} width={28} tick={{ fontSize: 11, fill: '#64727E' }} axisLine={false} tickLine={false} />
                  <Line type="monotone" dataKey="score" stroke="#1B6CA8" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title={S.clinic.distTitle}>
            <div className="flex flex-col gap-2.5 pt-1">
              {dist.map((d) => (
                <div key={d.level} className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 flex-none w-[86px]">
                    <span className={`w-2.5 h-2.5 rounded-full ${RISK_DOT[d.level]}`} />
                    <span className="text-[13px] font-bold text-ink">{d.label}</span>
                  </span>
                  <div className="flex-1 h-3.5 rounded-full bg-[#EDEFF2] overflow-hidden min-w-0">
                    <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: RISK_HEX[d.level] }} />
                  </div>
                  <span className="font-num text-[13px] font-extrabold text-ink flex-none w-16 text-right">
                    {d.n} <span className="text-muted font-bold">({d.pct}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card title={S.clinic.partTitle} hint={S.clinic.partHint}>
            <div className="h-[160px] -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.participation.map((p) => ({ name: S.tests[p.test].name, pct: Math.round(p.rate * 100) }))}
                  margin={{ top: 6, right: 8, bottom: 0, left: 0 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64727E' }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis domain={[0, 100]} width={30} tick={{ fontSize: 11, fill: '#64727E' }} axisLine={false} tickLine={false} />
                  <Bar dataKey="pct" radius={[5, 5, 0, 0]} isAnimationActive={false}>
                    {stats.participation.map((p) => (
                      <Cell key={p.test} fill={p.rate < 0.7 ? '#E8762C' : '#1B6CA8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* triage list */}
        <section className="bg-white rounded-card shadow-card overflow-hidden">
          <div className="px-4 py-3.5 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line">
            <h2 className="text-[15px] font-extrabold text-ink m-0 whitespace-nowrap">{S.clinic.tableTitle}</h2>
            <span className="text-[12px] font-semibold text-muted">{S.clinic.tableHint}</span>
            <div className="ml-auto flex gap-1.5">
              {([['all', S.clinic.filterAll], ['pending', S.clinic.filterPending], ['done', S.clinic.filterDone]] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`min-h-9 px-3 rounded-full text-[12.5px] font-bold cursor-pointer border ${
                    filter === k ? 'bg-secondary text-white border-secondary' : 'bg-white text-muted-2 border-line'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="text-[13.5px] font-semibold text-muted text-center py-8 m-0">{S.clinic.empty}</p>
          ) : (
            <>
              {/* desktop: a real table */}
              <table className="hidden lg:table w-full border-collapse">
                <thead>
                  <tr className="bg-[#FAFBFC]">
                    {[S.clinic.colCode, S.clinic.colAge, S.clinic.colLevel, S.clinic.colLast, S.clinic.colTrend, S.clinic.colFollow].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[12px] font-bold text-muted border-b border-line whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.code} className="border-b border-line last:border-b-0 hover:bg-[#FAFBFC]">
                      <td className="px-4 py-3">
                        <button onClick={() => setOpen(p.code)} className="font-num text-[14px] font-extrabold text-secondary bg-transparent border-0 cursor-pointer p-0 underline">
                          {p.code}
                        </button>
                        {p.streak >= 2 && (
                          <div className="text-[11.5px] font-bold text-risk-high-text mt-0.5">{S.clinic.streakDays(p.streak)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-num text-[13.5px] font-bold text-ink">{p.age}</td>
                      <td className="px-4 py-3"><LevelChip level={p.level} /></td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-muted-2 whitespace-nowrap">{relativeThaiTime(p.lastAt)}</td>
                      <td className="px-4 py-3"><TrendMark p={p} /></td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => claim(p.code)}
                          className={`min-h-9 px-3.5 rounded-ctl text-[12.5px] font-bold cursor-pointer border ${
                            p.followedUp ? 'bg-risk-low-bg text-risk-low-text border-transparent' : 'bg-secondary text-white border-secondary'
                          }`}
                        >
                          {p.followedUp ? `✓ ${S.clinic.claimed}` : S.clinic.claim}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* phone: cards, because a 6-column table cannot be read at 390px */}
              <div className="lg:hidden flex flex-col">
                {rows.map((p) => (
                  <div key={p.code} className="px-4 py-3.5 border-b border-line last:border-b-0 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={() => setOpen(p.code)} className="font-num text-[15px] font-extrabold text-secondary bg-transparent border-0 cursor-pointer p-0 underline">
                        {p.code}
                      </button>
                      <LevelChip level={p.level} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-semibold text-muted-2">
                      <span className="font-num">{S.clinic.detailAge(p.age)}</span>
                      <span>· {relativeThaiTime(p.lastAt)}</span>
                      <TrendMark p={p} />
                    </div>
                    {p.streak >= 2 && (
                      <span className="text-[12.5px] font-bold text-risk-high-text">{S.clinic.streakDays(p.streak)}</span>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOpen(p.code)}
                        className="flex-1 min-h-11 rounded-ctl border border-line bg-white text-[13px] font-bold text-muted-2 cursor-pointer"
                      >
                        {S.clinic.view}
                      </button>
                      <button
                        onClick={() => claim(p.code)}
                        className={`flex-1 min-h-11 rounded-ctl text-[13px] font-bold cursor-pointer border ${
                          p.followedUp ? 'bg-risk-low-bg text-risk-low-text border-transparent' : 'bg-secondary text-white border-secondary'
                        }`}
                      >
                        {p.followedUp ? `✓ ${S.clinic.claimed}` : S.clinic.claim}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <p className="text-[12px] font-semibold text-muted text-center leading-relaxed m-0 pb-2">{S.clinic.footnote}</p>
      </div>

      {selected && <Detail p={selected} onClose={() => setOpen(null)} onClaim={() => claim(selected.code)} />}
    </div>
  );
}
