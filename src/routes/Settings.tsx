import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '../components/AppBar';
import Avatar from '../components/Avatar';
import AvatarCapture from '../components/AvatarCapture';
import TabBar from '../components/TabBar';
import TextSizeToggle from '../components/ui/TextSizeToggle';
import { useSettings } from '../context/SettingsContext';
import { eraseAllData, logout } from '../lib/storage';
import { S } from '../lib/strings';

/** One settings group: a titled white card. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-card shadow-card overflow-hidden">
      <h2 className="text-base font-extrabold text-muted m-0 px-5 pt-4 pb-1">{title}</h2>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

/** A tappable row inside a Group. Rows divide themselves, so a group never
    ends on a stray hairline. */
function Row({
  label,
  sub,
  onClick,
  danger,
  action,
}: {
  label: string;
  sub?: string;
  onClick?: () => void;
  danger?: boolean;
  action?: React.ReactNode;
}) {
  const body = (
    <>
      <span className="flex flex-col min-w-0 text-left gap-0.5">
        <span className={`text-lg font-bold ${danger ? 'text-risk-high-text' : 'text-ink'}`}>{label}</span>
        {sub && <span className="text-base font-semibold text-muted leading-snug">{sub}</span>}
      </span>
      {action ?? (onClick && <span className="ml-auto flex-none text-muted text-xl">›</span>)}
    </>
  );
  const cls = 'w-full min-h-16 px-5 py-3 flex items-center gap-3 border-0 border-t border-line first:border-t-0 bg-transparent';
  return onClick ? (
    <button onClick={onClick} className={`${cls} cursor-pointer text-left`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/**
 * Settings as a screen rather than a bottom sheet.
 *
 * These controls used to live in a sheet launched from a gear in the Home
 * header, which put account, accessibility and data-deletion in the same
 * scrolling stack as whatever was behind them. As a tab destination they get
 * room to be grouped, and Home loses a job it did not need to carry.
 */
export default function Settings() {
  const { settings, update } = useSettings();
  const navigate = useNavigate();
  const [shooting, setShooting] = useState(false);
  const name = settings.displayName?.trim();

  return (
    <>
      <div className="min-h-dvh bg-bg max-w-md mx-auto px-5 pb-32 flex flex-col gap-4">
        <AppBar bleed="-mx-5 px-5" />
        <h1 className="text-3xl font-extrabold text-ink m-0">{S.home.settingsTitle}</h1>

        {/* account */}
        <section className="bg-white rounded-card shadow-card px-5 py-5 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar src={settings.avatar} size={72} />
            <div className="flex flex-col min-w-0 gap-0.5">
              <span className="text-xl font-extrabold text-ink break-words">{name || S.profile.title}</span>
              <span className="text-base font-semibold text-muted">
                {settings.userType === 'patient' ? S.login.patient : S.login.general}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setShooting(true)}
              className="min-h-14 px-4.5 rounded-ctl bg-secondary-soft text-secondary text-base font-extrabold border-0 cursor-pointer"
            >
              {settings.avatar ? S.profile.photoChange : S.profile.photoAdd}
            </button>
            {settings.avatar && (
              <button
                onClick={() => update({ avatar: undefined })}
                className="min-h-14 px-4.5 rounded-ctl bg-white text-risk-high-text text-base font-bold border-2 border-field cursor-pointer"
              >
                {S.profile.photoRemove}
              </button>
            )}
          </div>
        </section>

        <Group title={S.profile.title}>
          <Row label={S.profile.editProfile} sub={S.profile.editProfileSub} onClick={() => navigate('/login')} />
          <Row
            label={S.profile.signOut}
            onClick={() => {
              if (confirm(S.profile.signOutConfirm)) {
                logout();
                window.location.href = '/login';
              }
            }}
          />
        </Group>

        <Group title={S.settingsA11y}>
          <div className="px-5 py-4 flex flex-col gap-2.5">
            <span className="text-lg font-bold text-ink">{S.home.textSizeLabel}</span>
            <TextSizeToggle />
          </div>
          <Row
            label={S.home.voiceLabel}
            action={
              <button
                onClick={() => update({ voiceOn: !settings.voiceOn })}
                aria-pressed={settings.voiceOn}
                className={`ml-auto flex-none min-h-14 px-6 rounded-full font-extrabold text-lg cursor-pointer border-2 transition-colors ${
                  settings.voiceOn ? 'bg-secondary border-secondary text-white' : 'bg-white border-field text-muted-2'
                }`}
              >
                {settings.voiceOn ? S.home.on : S.home.off}
              </button>
            }
          />
        </Group>

        <Group title={S.settingsData}>
          {/* PDPA: makes the consent screen's "withdraw at any time" promise real */}
          <Row
            label={S.home.eraseLabel}
            danger
            onClick={() => {
              if (confirm(S.home.eraseConfirm)) {
                eraseAllData();
                window.location.href = '/';
              }
            }}
          />
          {/* Admin is an internal tool — not shown to patients */}
          {import.meta.env.DEV && <Row label={S.admin.openAdmin} onClick={() => navigate('/admin')} />}
        </Group>

        <p className="text-sm font-semibold text-muted text-center leading-relaxed m-0 px-2">{S.disclaimerShort}</p>
      </div>

      {shooting && (
        <AvatarCapture
          onClose={() => setShooting(false)}
          onSave={(dataUrl) => {
            update({ avatar: dataUrl });
            setShooting(false);
          }}
        />
      )}
      <TabBar />
    </>
  );
}
