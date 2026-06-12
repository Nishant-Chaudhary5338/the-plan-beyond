import { useEffect, useRef, useState } from 'react';
import { fetchSource } from '../../api/client';

type SourceState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready'; code: string };

/**
 * Self-contained source preview: given a node id, it fetches that node's source
 * text on mount (and whenever the id changes) and renders it in a scrollable
 * code block. Stale responses are dropped by tracking the requested id, so a
 * fast click-through can't paint an earlier node's source over a newer one.
 */
export const SourcePreview = ({
  nodeId,
}: {
  nodeId: string;
}): React.ReactElement => {
  const [state, setState] = useState<SourceState>({ status: 'loading' });
  const requestedId = useRef(nodeId);

  useEffect(() => {
    requestedId.current = nodeId;
    setState({ status: 'loading' });

    void fetchSource(nodeId).then((result) => {
      // Drop the response if the selection moved on while we were fetching.
      if (requestedId.current !== nodeId) return;
      if (!result || result.code.trim().length === 0) {
        setState({ status: 'empty' });
        return;
      }
      setState({ status: 'ready', code: result.code });
    });
  }, [nodeId]);

  if (state.status === 'loading') {
    return <p className="text-[12px] text-zinc-500">Loading source…</p>;
  }

  if (state.status === 'empty') {
    return <p className="text-[12px] text-zinc-500">No source available.</p>;
  }

  return (
    <pre className="max-h-72 overflow-auto whitespace-pre rounded-md bg-black/30 p-3 font-mono text-[12px] leading-relaxed text-zinc-300 ring-1 ring-white/[0.06]">
      {state.code}
    </pre>
  );
};
