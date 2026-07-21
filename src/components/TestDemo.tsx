import { S } from '../lib/strings';
import type { TestId } from '../lib/types';

/** Small spiral path for the demo animation (viewBox 100×100, 2.5 turns). */
function spiralD(): string {
  const cx = 50;
  const cy = 50;
  const turns = 2.5;
  const thMax = turns * 2 * Math.PI;
  const b = 36 / thMax;
  let d = `M ${cx} ${cy}`;
  for (let th = 0.15; th <= thMax; th += 0.15) {
    d += ` L ${(cx + b * th * Math.cos(th)).toFixed(1)} ${(cy + b * th * Math.sin(th)).toFixed(1)}`;
  }
  return d;
}

const SPIRAL_D = spiralD();

/**
 * Looping "how to do it" animation shown before each test starts —
 * a demonstration hand/face so elderly users see the gesture, not just read it.
 */
export default function TestDemo({ test }: { test: TestId }) {
  return (
    <div className="mt-3 flex items-center gap-4 bg-white rounded-[18px] px-4 py-3 shadow-[0_2px_10px_rgba(35,58,77,.06)] border border-line-warm">
      <div className="flex-none w-[92px] h-[92px] flex items-center justify-center overflow-hidden" aria-hidden="true">
        {test === 'spiral' && (
          <svg viewBox="0 0 100 100" width="92" height="92">
            <path d={SPIRAL_D} fill="none" stroke="#DCE3E9" strokeWidth="6" strokeLinecap="round" />
            <text fontSize="28" dx="-4" dy="12">
              👆
              <animateMotion dur="5s" repeatCount="indefinite" path={SPIRAL_D} />
            </text>
          </svg>
        )}
        {test === 'tapping' && (
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-primary nm-demo-press" />
            <span className="absolute text-4xl nm-demo-tap" style={{ top: 2 }}>
              👆
            </span>
          </div>
        )}
        {test === 'tremor' && (
          <div className="flex flex-col items-center -space-y-3">
            <span className="text-4xl nm-demo-sway inline-block">📱</span>
            <span className="text-4xl">🤲</span>
          </div>
        )}
        {test === 'facial' && (
          <div className="relative w-full h-full flex items-center justify-center gap-1">
            <span className="text-xl text-primary font-black nm-demo-a">←</span>
            <span className="text-4xl nm-demo-sway inline-block">🧑</span>
            <span className="text-xl text-primary font-black nm-demo-b">→</span>
          </div>
        )}
        {test === 'voice' && (
          <div className="flex items-center gap-1.5">
            <span className="text-5xl">😮</span>
            <span className="text-2xl font-extrabold text-primary nm-demo-voice inline-block">อา…</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-base font-extrabold text-secondary">{S.demoTitle}</span>
        <span className="text-[15px] font-semibold text-muted-2 leading-relaxed">{S.demoCaption[test]}</span>
      </div>
    </div>
  );
}
