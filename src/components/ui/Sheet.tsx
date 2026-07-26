import { useEffect, useRef, type ReactNode } from 'react';
import { S } from '../../lib/strings';

/**
 * Shared bottom sheet.
 *
 * Every sheet in the app used to be hand-rolled, so they behaved differently:
 * some had no close button, none handled Escape, and none locked the page
 * behind them (reopening a sheet could leave the page scrolled somewhere else).
 * This centralises the behaviour so all of them are dismissible the same way —
 * tap the scrim, tap ปิด, or press Escape.
 */
export default function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** optional actions pinned under the scrolling content */
  footer?: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    openerRef.current = document.activeElement;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    // stop the page behind the sheet from scrolling under the finger
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      // hand focus back to whatever opened the sheet
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-[rgba(35,58,77,.55)] flex items-end justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-[28px] px-6 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom))] flex flex-col gap-3 max-h-[88dvh] shadow-[0_-8px_32px_rgba(35,58,77,.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 rounded-full bg-line self-center flex-none" />
        <div className="flex items-center gap-3 flex-none">
          <h2 className="text-2xl font-extrabold text-ink m-0">{title}</h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label={S.result.close}
            className="ml-auto min-w-14 min-h-14 rounded-full bg-[#F4F6F8] border-2 border-field flex items-center justify-center cursor-pointer"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="#5A6B7A" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">{children}</div>
        {footer && <div className="flex-none flex flex-col gap-2 pt-1">{footer}</div>}
      </div>
    </div>
  );
}
