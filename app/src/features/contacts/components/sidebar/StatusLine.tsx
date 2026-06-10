import { cn } from '@/lib/cn';

type Tone = 'ok' | 'attention' | 'neutral';

const DOT: Record<Tone, string> = {
  ok: 'bg-accent',
  attention: 'bg-warning',
  neutral: 'bg-faint',
};

/**
 * A status line where colour is a *quiet* signal paired with reassuring copy —
 * never colour alone (UX brief A1). The amber dot flags attention; the words
 * tell you what to do about it.
 */
export function StatusLine({ tone, text }: { tone: Tone; text: string }) {
  return (
    <p className="flex items-center justify-center gap-2 text-center text-sm text-muted">
      <span className={cn('size-1.5 shrink-0 rounded-full', DOT[tone])} aria-hidden="true" />
      {text}
    </p>
  );
}
