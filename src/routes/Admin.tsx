import { useEffect, useRef, useState } from 'react';
import { FaceIcon, SpiralIcon, TapIcon, TremorIcon, VoiceIcon } from '../components/icons';
import { seedSampleData } from '../lib/storage';
import AppBar from '../components/AppBar';
import { S } from '../lib/strings';
import type { TestId } from '../lib/types';
import { deleteVideo, saveVideo, videoKeys } from '../lib/videos';

const TESTS: { id: TestId; icon: React.ReactNode }[] = [
  { id: 'spiral', icon: <SpiralIcon /> },
  { id: 'tapping', icon: <TapIcon /> },
  { id: 'tremor', icon: <TremorIcon /> },
  { id: 'facial', icon: <FaceIcon /> },
  { id: 'voice', icon: <VoiceIcon /> },
];

function Row({ id, icon, has, onChange }: { id: TestId; icon: React.ReactNode; has: boolean; onChange: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await saveVideo(id, file);
      onChange();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-line px-4 py-3.5 flex items-center gap-3.5">
      <div className="w-12 h-12 rounded-ctl bg-primary-soft flex items-center justify-center flex-none">{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className="text-lg font-extrabold text-ink">{S.tests[id].name}</span>
        <span className={`text-sm font-bold ${has ? 'text-risk-low-text' : 'text-muted'}`}>
          {has ? `✓ ${S.admin.hasVideo}` : S.admin.noVideo}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {has && (
          <button
            onClick={async () => {
              await deleteVideo(id);
              onChange();
            }}
            className="h-11 px-3 rounded-[12px] border-2 border-field bg-white text-risk-high-text text-sm font-bold cursor-pointer"
          >
            {S.admin.remove}
          </button>
        )}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="h-11 px-4 rounded-[12px] bg-secondary text-white text-sm font-extrabold cursor-pointer border-0 disabled:opacity-50"
        >
          {busy ? '…' : has ? S.admin.replace : S.admin.upload}
        </button>
        <input ref={inputRef} type="file" accept="video/*" onChange={onFile} className="hidden" />
      </div>
    </div>
  );
}

/** Hidden admin screen to attach tutorial clips per test (stored locally). */
export default function Admin() {
  const [keys, setKeys] = useState<TestId[]>([]);
  const [seeded, setSeeded] = useState(false);
  const refresh = () => setKeys(videoKeys());
  useEffect(refresh, []);

  return (
    <div className="min-h-dvh bg-bg max-w-md mx-auto px-6 pb-10 flex flex-col gap-4">
      <AppBar />
      <h1 className="text-3xl font-extrabold text-ink m-0">{S.admin.title}</h1>
      <p className="text-base font-medium text-muted-2 leading-relaxed -mt-2">{S.admin.subtitle}</p>

      <div className="flex flex-col gap-3 mt-1">
        {TESTS.map((t) => (
          <Row key={t.id} id={t.id} icon={t.icon} has={keys.includes(t.id)} onChange={refresh} />
        ))}
      </div>

      {/* demo aid: keeps the trend chart and history from being empty on stage */}
      <div className="mt-4 bg-white rounded-2xl border border-line px-4 py-4 flex flex-col gap-2">
        <span className="text-lg font-extrabold text-ink">{S.admin.seedTitle}</span>
        <span className="text-base font-medium text-muted-2 leading-relaxed">{S.admin.seedDesc}</span>
        <button
          onClick={() => {
            seedSampleData();
            setSeeded(true);
          }}
          className="mt-1 min-h-14 rounded-ctl bg-secondary text-white text-lg font-extrabold border-0 cursor-pointer"
        >
          {seeded ? S.admin.seedDone : S.admin.seedBtn}
        </button>
      </div>
    </div>
  );
}
