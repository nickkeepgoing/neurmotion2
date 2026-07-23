import { useSettings } from '../../context/SettingsContext';

/**
 * Text-size control. Each segment carries a Thai word as well as the A/A+/A++
 * specimen — three Latin letters mean nothing to the elderly Thai users this
 * app is for — and every segment is a ≥56px target, since an accessibility
 * control that is itself hard to hit is self-defeating.
 */
const LEVELS = [
  { label: 'A', word: 'ปกติ', scale: 0 as const, cls: 'text-[18px]' },
  { label: 'A+', word: 'ใหญ่', scale: 1 as const, cls: 'text-[22px]' },
  { label: 'A++', word: 'ใหญ่พิเศษ', scale: 2 as const, cls: 'text-[26px]' },
];

export default function TextSizeToggle() {
  const { settings, update } = useSettings();
  return (
    <div
      className="w-full grid grid-cols-3 rounded-[16px] border-2 border-field overflow-hidden bg-white"
      role="radiogroup"
      aria-label="ขนาดตัวอักษร"
    >
      {LEVELS.map((l, i) => {
        const selected = settings.textScale === l.scale;
        return (
          <button
            key={l.label}
            onClick={() => update({ textScale: l.scale })}
            role="radio"
            aria-checked={selected}
            aria-label={`ขนาดตัวอักษร${l.word}`}
            className={`min-h-16 px-1 py-2 flex flex-col items-center justify-center gap-0.5 cursor-pointer border-0 ${
              i > 0 ? 'border-l-2 border-l-field' : ''
            } ${selected ? 'bg-secondary text-white' : 'bg-white'}`}
          >
            <span className={`font-num font-black leading-none ${l.cls} ${selected ? 'text-white' : 'text-ink'}`}>
              {l.label}
            </span>
            <span className={`text-base font-bold leading-none ${selected ? 'text-white' : 'text-muted'}`}>{l.word}</span>
          </button>
        );
      })}
    </div>
  );
}
