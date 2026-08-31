import { useEffect, useRef, useState } from 'react';
import { FaceIcon, SpiralIcon, TapIcon, TremorIcon, VoiceIcon } from '../components/icons';
import { seedSampleData } from '../lib/storage';
import AppBar from '../components/AppBar';
import { isSupabaseConfigured } from '../lib/supabase';
import { S } from '../lib/strings';
import type { TestId } from '../lib/types';
import {
  cloudVideoStatus,
  deleteVideo,
  deleteVideoFromCloud,
  deleteYouTubeLink,
  saveVideo,
  saveYouTubeLink,
  uploadVideoToCloud,
  type CloudVideoStatus,
  type UploadProgressInfo,
} from '../lib/videos';

const TESTS: { id: TestId; icon: React.ReactNode }[] = [
  { id: 'spiral', icon: <SpiralIcon /> },
  { id: 'tapping', icon: <TapIcon /> },
  { id: 'tremor', icon: <TremorIcon /> },
  { id: 'facial', icon: <FaceIcon /> },
  { id: 'voice', icon: <VoiceIcon /> },
];

type CloudState = 'checking' | CloudVideoStatus;

function Row({
  id,
  icon,
  cloud,
  onChange,
}: {
  id: TestId;
  icon: React.ReactNode;
  cloud: CloudState;
  onChange: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progressInfo, setProgressInfo] = useState<UploadProgressInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ytInput, setYtInput] = useState('');
  const [ytBusy, setYtBusy] = useState(false);

  // Uploading writes to BOTH tiers from one action: the cloud copy is what
  // every judge's phone sees; the local copy is this device's own offline
  // fallback if the venue's network drops mid-demo. One button, two safety
  // nets, so the admin never has to think about which store they are filling.
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgressInfo({ stage: 'uploading', percent: 0 });
    try {
      const [cloudResult] = await Promise.all([
        uploadVideoToCloud(id, file, (info) => setProgressInfo(info)),
        saveVideo(id, file),
      ]);
      if (!cloudResult.ok) setError(cloudResult.reason);
      onChange();
    } finally {
      setBusy(false);
      setProgressInfo(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onRemove = async () => {
    setBusy(true);
    setError(null);
    try {
      const cloudResult =
        cloud !== 'checking' && cloud.kind === 'youtube' ? await deleteYouTubeLink(id) : await deleteVideoFromCloud(id);
      if (!cloudResult.ok) setError(cloudResult.reason);
      await deleteVideo(id);
      onChange();
    } finally {
      setBusy(false);
    }
  };

  const onSaveYt = async () => {
    if (!ytInput.trim()) return;
    setYtBusy(true);
    setError(null);
    try {
      const result = await saveYouTubeLink(id, ytInput);
      if (!result.ok) setError(result.reason);
      else setYtInput('');
      onChange();
    } finally {
      setYtBusy(false);
    }
  };

  const kind = cloud === 'checking' ? null : cloud.kind;
  const hasCloud = kind === 'youtube' || kind === 'file';
  const isCompressing = progressInfo?.stage === 'compressing';

  return (
    <div className="bg-white rounded-2xl border border-line px-4 py-3.5 flex flex-col gap-2.5">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-ctl bg-primary-soft flex items-center justify-center flex-none">{icon}</div>
        <div className="flex flex-col min-w-0 gap-0.5">
          <span className="text-lg font-extrabold text-ink">{S.tests[id].name}</span>
          {progressInfo ? (
            <span className="text-sm font-extrabold text-secondary">
              {isCompressing ? S.admin.compressing : S.admin.uploading}
            </span>
          ) : cloud === 'checking' ? (
            <span className="text-sm font-bold text-muted">{S.admin.checking}</span>
          ) : (
            <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${hasCloud ? 'text-risk-low-text' : 'text-muted'}`}>
              <span className={`w-2 h-2 rounded-full flex-none ${hasCloud ? 'bg-risk-low' : 'bg-line'}`} />
              {kind === 'youtube' ? S.admin.hasCloudVideoYouTube : kind === 'file' ? S.admin.hasCloudVideo : S.admin.noVideo}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 flex-none">
          {hasCloud && (
            <button
              onClick={onRemove}
              disabled={busy}
              className="h-11 px-3 rounded-[12px] border-2 border-field bg-white text-risk-high-text text-sm font-bold cursor-pointer disabled:opacity-50"
            >
              {S.admin.remove}
            </button>
          )}
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="h-11 px-4 rounded-[12px] bg-secondary text-white text-sm font-extrabold cursor-pointer border-0 disabled:opacity-50"
          >
            {busy ? '…' : kind === 'file' ? S.admin.replace : S.admin.upload}
          </button>
          <input ref={inputRef} type="file" accept="video/*" onChange={onFile} className="hidden" />
        </div>
      </div>

      {progressInfo && (
        <div className="flex flex-col gap-1.5 bg-[#F4F8FB] rounded-xl p-3 border border-secondary-soft/50">
          <div className="flex justify-between items-center text-sm font-extrabold text-secondary">
            <span>{isCompressing ? S.admin.compressing : S.admin.uploading}</span>
            <span className="font-num font-black">{progressInfo.percent}%</span>
          </div>
          <div className="w-full h-2.5 bg-line-warm rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full transition-all duration-150"
              style={{ width: `${progressInfo.percent}%` }}
            />
          </div>
        </div>
      )}

      {kind !== 'youtube' && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-muted-2">{S.admin.ytLabel}</span>
          <div className="flex items-center gap-2">
            <input
              type="url"
              inputMode="url"
              value={ytInput}
              onChange={(e) => setYtInput(e.target.value)}
              placeholder={S.admin.ytPlaceholder}
              disabled={ytBusy}
              className="flex-1 min-w-0 h-11 px-3 rounded-[12px] border-2 border-field bg-white text-sm font-semibold text-ink disabled:opacity-50"
            />
            <button
              onClick={onSaveYt}
              disabled={ytBusy || !ytInput.trim()}
              className="h-11 px-3.5 rounded-[12px] bg-secondary text-white text-sm font-extrabold cursor-pointer border-0 disabled:opacity-50 flex-none"
            >
              {ytBusy ? S.admin.ytSaving : S.admin.ytSave}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm font-semibold text-risk-high-text bg-risk-high-bg rounded-[10px] px-3 py-2 m-0 leading-relaxed">
          {S.admin.cloudError}: {error}
        </p>
      )}
    </div>
  );
}

/**
 * Hidden admin screen to attach tutorial clips per test.
 *
 * Two ways to attach a clip, both visible on every device that opens the
 * site (including a judge's own phone from the QR link) once saved here:
 *   - Paste a YouTube (Unlisted) link — no size limit, no re-encode, full
 *     source quality via YouTube's own player.
 *   - Upload a file — goes to Supabase Storage (public bucket `tutorials`);
 *     large files are compressed client-side to fit the 50MB limit.
 * A local copy of an uploaded file is also kept on this device as an offline
 * fallback; see lib/videos.ts for the full priority order.
 */
export default function Admin() {
  const [cloud, setCloud] = useState<Record<TestId, CloudState>>({
    spiral: 'checking', tapping: 'checking', tremor: 'checking', facial: 'checking', voice: 'checking',
  });
  const [seeded, setSeeded] = useState(false);

  const refresh = () => {
    setCloud((prev) => {
      const next = { ...prev };
      (Object.keys(next) as TestId[]).forEach((k) => (next[k] = 'checking'));
      return next;
    });
    cloudVideoStatus().then((status) => {
      const next = {} as Record<TestId, CloudState>;
      (Object.keys(status) as TestId[]).forEach((k) => (next[k] = status[k]));
      setCloud(next);
    });
  };
  useEffect(refresh, []);

  return (
    <div className="min-h-dvh bg-bg max-w-md mx-auto px-6 pb-10 flex flex-col gap-4">
      <AppBar />
      <h1 className="text-3xl font-extrabold text-ink m-0">{S.admin.title}</h1>
      <p className="text-base font-medium text-muted-2 leading-relaxed -mt-2">{S.admin.subtitle}</p>

      {!isSupabaseConfigured() && (
        <div className="rounded-2xl bg-risk-high-bg border-2 border-[#F2D2CC] px-4 py-3.5 flex flex-col gap-1">
          <span className="text-base font-extrabold text-risk-high-text">{S.admin.notConfiguredTitle}</span>
          <span className="text-sm font-semibold text-[#8A5A5A] leading-relaxed">{S.admin.notConfiguredDesc}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 mt-1">
        {TESTS.map((t) => (
          <Row key={t.id} id={t.id} icon={t.icon} cloud={cloud[t.id]} onChange={refresh} />
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
