import { useNavigate } from 'react-router-dom';
import Button from './ui/Button';
import { S } from '../lib/strings';

/**
 * Permission-denied state with a working retry.
 *
 * The previous screen told the user to allow access "in your browser settings,
 * then try again" — a sentence that means nothing to someone who only uses
 * LINE, and there was no retry control anywhere on it.
 */
export default function PermissionDenied({ kind, onRetry }: { kind: 'camera' | 'mic' | 'motion'; onRetry: () => void }) {
  const navigate = useNavigate();
  const copy = S.permission[kind];

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 py-8">
      <div className="w-16 h-16 rounded-full bg-risk-med-bg flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M12 3l9 16H3l9-16z" stroke="#9C7A10" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 10v4M12 17v.1" stroke="#9C7A10" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-2xl font-extrabold text-ink text-center m-0">{copy.title}</p>
      <p className="text-lg font-semibold text-muted-2 leading-relaxed whitespace-pre-line m-0">{copy.body}</p>
      <div className="w-full flex flex-col gap-3 mt-2">
        <Button className="nm-blink" onClick={onRetry}>
          {S.permission.retry}
        </Button>
        <Button variant="outline" onClick={() => navigate('/home')}>
          {S.skip}
        </Button>
      </div>
    </div>
  );
}
