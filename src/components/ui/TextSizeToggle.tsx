import { useSettings } from '../../context/SettingsContext';

const LEVELS = [
  { label: 'A', scale: 0 as const, cls: 'text-[15px]' },
  { label: 'A+', scale: 1 as const, cls: 'text-[17px]' },
  { label: 'A++', scale: 2 as const, cls: 'text-[19px]' },
];

export default function TextSizeToggle() {
  const { settings, update } = useSettings();
  return (
    <div className="flex items-center rounded-[14px] border-2 border-field overflow-hidden bg-white" role="group" aria-label="ขนาดตัวอักษร">
      {LEVELS.map((l, i) => (
        <button
          key={l.label}
          onClick={() => update({ textScale: l.scale })}
          aria-pressed={settings.textScale === l.scale}
          className={`px-3 py-2 font-bold min-w-11 cursor-pointer ${l.cls} ${i > 0 ? 'border-l-2 border-field' : ''} ${
            settings.textScale === l.scale ? 'bg-secondary text-white' : 'bg-white text-muted-2'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
