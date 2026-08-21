/** Profile picture, falling back to the generic person mark when unset. */
export default function Avatar({ src, size }: { src?: string; size: number }) {
  return (
    <div
      className="flex-none rounded-full bg-primary-softer overflow-hidden flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        <svg width={size * 0.54} height={size * 0.54} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" stroke="#E8762C" strokeWidth="2.4" />
          <path d="M4 20c0-3.3 3.6-5.5 8-5.5s8 2.2 8 5.5" stroke="#E8762C" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
}
