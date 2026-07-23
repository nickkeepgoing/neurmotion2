import { S } from '../lib/strings';

/**
 * Stepper for the 3-step test flow: ดูคลิป · ทดลองใช้ · ทดสอบจริง.
 *
 * Only fixed-size circles and flexible connectors sit in the row — the step
 * NAMES live on a single caption line underneath. Putting three Thai labels in
 * the row made it burst the viewport once the text scaled up (472px on a 375px
 * screen at A++); this layout cannot overflow at any text size.
 */
export default function TestStages({ current }: { current: 0 | 1 | 2 }) {
  return (
    <div className="mt-3 flex flex-col gap-2" aria-label={`ขั้นตอนที่ ${current + 1} จาก 3: ${S.flow.steps[current]}`}>
      <div className="flex items-center gap-2" aria-hidden="true">
        {S.flow.steps.map((label, i) => {
          const state = i < current ? 'done' : i === current ? 'active' : 'todo';
          return (
            <div key={label} className={`flex items-center gap-2 ${i < 2 ? 'flex-1' : ''}`}>
              <span
                className={`flex-none w-10 h-10 rounded-full flex items-center justify-center text-lg font-num font-extrabold ${
                  state === 'active'
                    ? 'bg-primary-action text-white ring-4 ring-primary-soft'
                    : state === 'done'
                      ? 'bg-risk-low text-white'
                      : 'bg-white text-muted border-2 border-field'
                }`}
              >
                {state === 'done' ? '✓' : i + 1}
              </span>
              {i < 2 && <div className={`flex-1 h-1 rounded-full ${i < current ? 'bg-risk-low' : 'bg-line'}`} />}
            </div>
          );
        })}
      </div>
      <span className="text-base font-bold text-ink">
        ขั้นที่ {current + 1} จาก 3 · {S.flow.steps[current]}
      </span>
    </div>
  );
}
