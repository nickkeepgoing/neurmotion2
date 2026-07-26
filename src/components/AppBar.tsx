import { useNavigate } from 'react-router-dom';
import { S } from '../lib/strings';

/**
 * Sticky top bar with a labelled back button.
 *
 * The app is installed as display:standalone, so there is no browser back
 * button — this bar is the only guaranteed way out of a screen, which is why
 * it stays pinned instead of scrolling away, and why the chevron carries the
 * visible word "กลับ" rather than being an icon a 72-year-old has to decode.
 *
 * `bleed` cancels the parent's horizontal padding so the bar's translucent
 * background spans the full width; pass the pair that matches the parent
 * (e.g. "-mx-6 px-6").
 */
export default function AppBar({
  to = '/home',
  bleed = '-mx-6 px-6',
  children,
}: {
  to?: string;
  bleed?: string;
  /** optional trailing content, e.g. a step chip */
  children?: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className={`sticky top-0 z-30 ${bleed} py-3 bg-[rgba(255,249,242,.94)] backdrop-blur-md flex items-center gap-2.5`}>
      <button
        onClick={() => navigate(to)}
        className="flex-none min-h-14 pl-3 pr-4 rounded-full bg-white border-2 border-[#E5E0D8] flex items-center gap-1.5 cursor-pointer"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M15 5l-7 7 7 7" stroke="#5A6B7A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-base font-bold text-muted-2">{S.back}</span>
      </button>
      {children}
    </div>
  );
}
