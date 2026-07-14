import type { RiskLevel } from '../../lib/types';

/**
 * Semicircular risk gauge, traced from the design export.
 * Needle sweeps −75° (score 0) → +75° (score 100).
 */
export default function RiskGauge({ score, level }: { score: number; level: RiskLevel }) {
  const angle = -75 + (Math.min(Math.max(score, 0), 100) / 100) * 150;
  return (
    <svg width="230" height="128" viewBox="0 0 230 128" role="img" aria-label={`คะแนน ${score} จาก 100`}>
      <path d="M18 118 A 97 97 0 0 1 66 34" stroke="#2E9E5B" strokeWidth="18" strokeLinecap="round" fill="none" opacity={level === 'low' ? 1 : 0.25} />
      <path d="M80 26 A 97 97 0 0 1 150 26" stroke="#F1C232" strokeWidth="18" strokeLinecap="round" fill="none" opacity={level === 'medium' ? 1 : 0.3} />
      <path d="M164 34 A 97 97 0 0 1 212 118" stroke="#D64545" strokeWidth="18" strokeLinecap="round" fill="none" opacity={level === 'high' ? 1 : 0.25} />
      <g transform={`rotate(${angle} 115 118)`}>
        <line x1="115" y1="118" x2="115" y2="46" stroke="#233A4D" strokeWidth="6" strokeLinecap="round" />
      </g>
      <circle cx="115" cy="118" r="10" fill="#233A4D" />
    </svg>
  );
}
