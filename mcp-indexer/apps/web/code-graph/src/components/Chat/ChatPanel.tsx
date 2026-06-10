import { useState } from 'react';
import { MessageSquare, Loader2, Send } from 'lucide-react';
import { postChat, type ChatResult } from '../../api/client';

type ChatPanelProps = {
  onCite: (nodeId: string) => void;
};

type Turn = { question: string; result: ChatResult | null };

const EXAMPLES = [
  'What does the indexer do?',
  'Where is the graph rendered?',
];

export const ChatPanel = ({ onCite }: ChatPanelProps): React.ReactElement => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);

  const ask = async (): Promise<void> => {
    const q = question.trim();
    if (!q || loading) return;
    setQuestion('');
    setTurns((t) => [...t, { question: q, result: null }]);
    setLoading(true);
    try {
      const result = await postChat(q);
      setTurns((t) =>
        t.map((turn, i) => (i === t.length - 1 ? { ...turn, result } : turn)),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-5 right-5 flex items-center gap-2 rounded-full bg-violet-500/20 px-4 py-2 text-sm text-violet-100 ring-1 ring-violet-400/25 shadow-[0_0_24px_-6px_rgba(139,92,246,0.55)] backdrop-blur-xl hover:-translate-y-0.5 hover:bg-violet-500/30"
      >
        <MessageSquare className="h-4 w-4" />
        Ask the codebase
      </button>
    );
  }

  return (
    <div className="animate-rise glass absolute bottom-5 right-5 flex h-[28rem] w-96 flex-col rounded-2xl">
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <span className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <MessageSquare className="h-4 w-4 text-violet-400" />
          Ask the codebase
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          close
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {turns.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-2 text-center">
            <MessageSquare className="mb-2 h-6 w-6 text-zinc-700" />
            <p className="mb-3 text-sm text-zinc-500">
              Ask anything about this codebase
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setQuestion(example)}
                  className="rounded-full border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
        {turns.map((turn, i) => (
          <div key={i} className="space-y-1.5">
            <p className="text-sm font-medium text-zinc-300">{turn.question}</p>
            {turn.result ? (
              <ChatAnswer result={turn.result} onCite={onCite} />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-white/[0.06] px-3 py-2.5">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void ask();
          }}
          placeholder="Ask a question…"
          className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-1.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-violet-400/40"
        />
        <button
          type="button"
          onClick={() => void ask()}
          disabled={loading}
          className="rounded bg-violet-500/20 p-1.5 text-violet-300 transition-colors hover:bg-violet-500/30 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const ChatAnswer = ({
  result,
  onCite,
}: {
  result: ChatResult;
  onCite: (id: string) => void;
}): React.ReactElement => (
  <div className="rounded-lg bg-zinc-900/70 p-3">
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
      {result.answer}
    </p>
    {result.citations.length > 0 && (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {result.citations.slice(0, 5).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onCite(id)}
            className="max-w-full truncate rounded bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-200"
          >
            {id.replace(/^[a-z]+:/, '')}
          </button>
        ))}
      </div>
    )}
    {!result.usedLlm && (
      <p className="mt-1.5 text-[11px] text-zinc-600">keyword match (no LLM)</p>
    )}
  </div>
);
