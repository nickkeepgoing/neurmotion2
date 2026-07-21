import { S } from '../lib/strings';

/** Stepper header for the 3-step test flow: ดูคลิป · ทดลองใช้ · ทดสอบจริง. */
export default function TestStages({ current }: { current: 0 | 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mt-3" aria-label={`ขั้นตอนที่ ${current + 1} จาก 3`}>
      {S.flow.steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'todo';
        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`flex-none w-8 h-8 rounded-full flex items-center justify-center text-base font-extrabold ${
                  state === 'active'
                    ? 'bg-primary text-white'
                    : state === 'done'
                      ? 'bg-risk-low text-white'
                      : 'bg-line text-muted'
                }`}
              >
                {state === 'done' ? '✓' : i + 1}
              </span>
              <span
                className={`text-[15px] font-bold truncate ${
                  state === 'active' ? 'text-ink' : state === 'done' ? 'text-risk-low-text' : 'text-muted'
                }`}
              >
                {label}
              </span>
            </div>
            {i < 2 && <div className={`flex-1 h-0.5 rounded ${i < current ? 'bg-risk-low' : 'bg-line'}`} />}
          </div>
        );
      })}
    </div>
  );
}
