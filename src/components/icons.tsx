/** Test-tile + shared icons, traced from the design export. */

export function SpiralIcon({ size = 26, color = '#E8762C' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 12 a1.5 1.5 0 0 1 1.5 1.5 a3 3 0 0 1 -3 3 a4.5 4.5 0 0 1 -4.5 -4.5 a6 6 0 0 1 6 -6 a7.5 7.5 0 0 1 7.5 7.5 a9 9 0 0 1 -9 9"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function TapIcon({ size = 26, color = '#E8762C' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="2.2" />
      <circle cx="12" cy="12" r="3" fill={color} />
    </svg>
  );
}

export function TremorIcon({ size = 26, color = '#E8762C' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="8" y="3" width="8" height="14" rx="2.5" stroke={color} strokeWidth="2.2" />
      <path d="M4 8 q1.5 -2 0 -4 M20 8 q-1.5 -2 0 -4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M9 17 v1.5 c0 1.8 1.2 2.8 3 2.8 s3-1 3-2.8" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function FaceIcon({ size = 26, color = '#E8762C' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2.2" />
      <path d="M8.5 14 q3.5 3 7 0" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="9" cy="9.5" r="1.3" fill={color} />
      <circle cx="15" cy="9.5" r="1.3" fill={color} />
    </svg>
  );
}

export function VoiceIcon({ size = 26, color = '#E8762C' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke={color} strokeWidth="2.2" />
      <path d="M5 11 a7 7 0 0 0 14 0 M12 18v3" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function CheckCircle({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#2E9E5B" />
      <path d="M7.5 12.5l3 3 6-6.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChartIcon({ size = 30, color = '#1B6CA8' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 19 L8 12 L12 15 L17 7 L20 10" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Brand hero: hand + pulse line (splash / logo). */
export function HandPulse({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <path
        d="M30 52 V30 c0-3.3 2.7-6 6-6 s6 2.7 6 6 v14 M42 44 v-8 c0-3.3 2.7-6 6-6 s6 2.7 6 6 v8 M54 44 v-5 c0-3.3 2.7-6 6-6 s6 2.7 6 6 v13 c0 14-8 26-22 26 -10 0-15-5-20-13 l-5-8 c-1.8-2.9-.9-6.5 2-8.3 2.6-1.6 6-1 7.9 1.4 L30 52"
        stroke="#1B6CA8"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 60 h14 l5-10 7 18 6-13 4 5 h24" stroke="#E8762C" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldIcon({ size = 22, color = '#1B6CA8' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3z" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
