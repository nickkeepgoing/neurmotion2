import { useLocation, useNavigate } from 'react-router-dom';
import { S } from '../lib/strings';

/**
 * Bottom tab bar.
 *
 * Everything used to hang off the Home screen — results were a tile in the
 * grid, settings were a sheet behind a gear in the header — so the app read as
 * one long page rather than an app, and Home carried every job at once. Giving
 * the three destinations a permanent bar moves work off Home and puts the way
 * back to each one in the same place on every screen.
 *
 * Deliberately NOT shown during a test: those screens are a single focused
 * task with their own way out, and a tab bar there invites someone to wander
 * off mid-measurement.
 *
 * Icon and label always ship together — a bare glyph is not decodable by the
 * users this app is for.
 */
const TABS = [
  {
    to: '/home',
    label: S.nav.home,
    icon: (a: boolean) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path
          d="M3.5 11.2 12 4l8.5 7.2V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1v-8.8Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          fill={a ? 'currentColor' : 'none'}
          fillOpacity={a ? 0.16 : 0}
        />
      </svg>
    ),
  },
  {
    to: '/result',
    label: S.nav.result,
    icon: (a: boolean) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" fill={a ? 'currentColor' : 'none'} fillOpacity={a ? 0.16 : 0} />
        <path d="M7.5 14.5 11 11l2.5 2.5L17 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: S.nav.settings,
    icon: (a: boolean) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="2" fill={a ? 'currentColor' : 'none'} fillOpacity={a ? 0.16 : 0} />
        <path
          d="M19 12a7 7 0 0 0-.2-1.6l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2.8-1.6L13.2 2h-2.4l-.5 2.4a7 7 0 0 0-2.8 1.6l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .5.1 1.1.2 1.6l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2.8 1.6l.5 2.4h2.4l.5-2.4a7 7 0 0 0 2.8-1.6l2.3 1 2-3.4-2-1.5c.1-.5.2-1 .2-1.6Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function TabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      aria-label={S.nav.label}
      className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-md bg-[rgba(255,249,242,.92)] backdrop-blur-xl border-t border-line-warm shadow-bar pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex list-none m-0 px-2 py-1.5">
        {TABS.map((t) => {
          const active = pathname === t.to;
          return (
            <li key={t.to} className="flex-1">
              <button
                onClick={() => navigate(t.to)}
                aria-current={active ? 'page' : undefined}
                className={`w-full min-h-16 rounded-ctl flex flex-col items-center justify-center gap-0.5 bg-transparent border-0 cursor-pointer ${
                  active ? 'text-primary-action' : 'text-muted'
                }`}
              >
                {t.icon(active)}
                <span className={`text-sm leading-none ${active ? 'font-extrabold' : 'font-semibold'}`}>{t.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
