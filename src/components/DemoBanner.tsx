import { useState } from 'react';
import { isDemo } from '../lib/demoMode';
import { S } from '../lib/strings';

/**
 * Standing marker that this session was opened from the demo QR link.
 *
 * Without it, a judge could take the seeded week of results for their own — or
 * for real patient data.
 *
 * It floats clear of the bottom tab bar rather than at the very bottom edge:
 * pinned flush it sat directly on top of หน้าหลัก/ผลของฉัน/ตั้งค่า, which are
 * exactly the controls a judge needs during the demo. Dismissible for the same
 * reason — it must never be the thing standing between them and a tap.
 */
export default function DemoBanner() {
  const [hidden, setHidden] = useState(false);
  if (!isDemo() || hidden) return null;

  return (
    // bottom offset clears the fixed tab bar (min-h-16 + padding + safe area)
    <div className="fixed left-0 right-0 z-50 pointer-events-none flex justify-center bottom-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto m-2 flex items-center gap-2 rounded-full bg-[rgba(35,58,77,.92)] backdrop-blur-md pl-3.5 pr-1.5 py-1.5 shadow-raised">
        <span className="text-[13px] font-bold text-white whitespace-nowrap">{S.demo.banner}</span>
        <button
          onClick={() => setHidden(true)}
          aria-label={S.demo.hide}
          className="flex-none w-7 h-7 rounded-full bg-white/15 border-0 text-white text-[15px] leading-none cursor-pointer"
        >
          ×
        </button>
      </div>
    </div>
  );
}
