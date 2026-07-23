/**
 * Birth-date picker: day / month / Buddhist-era year as three large native
 * <select>s — on phones these open the OS scroll-wheel picker, which is the
 * easiest input style for elderly users.
 */

export type BirthDate = { d: number; m: number; yBE: number }; // m: 0-11

export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export function birthDateToISO(b: BirthDate): string {
  const y = b.yBE - 543;
  return `${y}-${String(b.m + 1).padStart(2, '0')}-${String(b.d).padStart(2, '0')}`;
}

export function birthDateFromISO(iso: string): BirthDate | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { yBE: parseInt(m[1], 10) + 543, m: parseInt(m[2], 10) - 1, d: parseInt(m[3], 10) };
}

export function ageFromBirthDate(b: BirthDate): number {
  const birth = new Date(b.yBE - 543, b.m, b.d);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hadBirthday = now.getMonth() > b.m || (now.getMonth() === b.m && now.getDate() >= b.d);
  if (!hadBirthday) age -= 1;
  return Math.max(age, 0);
}

function daysInMonth(m: number, yBE: number): number {
  return new Date(yBE - 543, m + 1, 0).getDate();
}

// `min-w-0 w-full` lets the three columns shrink inside their flex row —
// without it the intrinsic width of the widest option pushed the row past the
// viewport once the text scaled up (A++).
const selectCls =
  'min-h-16 w-full min-w-0 rounded-[18px] border-2 border-field bg-white px-1.5 text-xl font-semibold text-ink focus:border-secondary focus:outline-none cursor-pointer appearance-none text-center';

export default function BirthDatePicker({ value, onChange }: { value: BirthDate; onChange: (b: BirthDate) => void }) {
  const nowBE = new Date().getFullYear() + 543;
  const years: number[] = [];
  for (let y = nowBE; y >= nowBE - 100; y--) years.push(y);
  const dim = daysInMonth(value.m, value.yBE);

  const set = (patch: Partial<BirthDate>) => {
    const next = { ...value, ...patch };
    // clamp the day when the month/year shrinks (e.g. 31 → ก.พ.)
    next.d = Math.min(next.d, daysInMonth(next.m, next.yBE));
    onChange(next);
  };

  return (
    <div className="flex gap-2.5">
      <label className="flex-1 min-w-0 flex flex-col gap-1.5">
        <span className="text-sm font-bold text-muted text-center">วัน</span>
        <select className={selectCls} value={value.d} onChange={(e) => set({ d: parseInt(e.target.value, 10) })} aria-label="วันเกิด — วัน">
          {Array.from({ length: dim }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </label>
      <label className="flex-[1.6] min-w-0 flex flex-col gap-1.5">
        <span className="text-sm font-bold text-muted text-center">เดือน</span>
        <select className={selectCls} value={value.m} onChange={(e) => set({ m: parseInt(e.target.value, 10) })} aria-label="วันเกิด — เดือน">
          {THAI_MONTHS_FULL.map((name, i) => (
            <option key={i} value={i}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex-1 min-w-0 flex flex-col gap-1.5">
        <span className="text-sm font-bold text-muted text-center">ปี พ.ศ.</span>
        <select className={selectCls} value={value.yBE} onChange={(e) => set({ yBE: parseInt(e.target.value, 10) })} aria-label="วันเกิด — ปี พ.ศ.">
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
