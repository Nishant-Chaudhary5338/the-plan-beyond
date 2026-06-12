import { GraphSnapshot, type NodeKnowledge } from '@repo/code-graph-core';

export const fetchGraph = async (): Promise<GraphSnapshot> => {
  // The viewer needs the whole graph to render. `?full=1` bypasses the server's
  // token-safe default, which returns a compact summary (no nodes/edges) on large
  // repos — that default is for AI agents, not this client.
  const res = await fetch('/api/graph?full=1');
  if (!res.ok) {
    throw new Error(`Failed to load graph (${res.status})`);
  }
  const raw = (await res.json()) as unknown;
  return GraphSnapshot.parse(raw);
};

export const postKnowledge = async (
  nodeId: string,
): Promise<NodeKnowledge | null> => {
  const res = await fetch(`/api/knowledge/${encodeURIComponent(nodeId)}`, {
    method: 'POST',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { knowledge: NodeKnowledge | null };
  return data.knowledge;
};

export type ChatResult = {
  answer: string;
  citations: string[];
  usedLlm: boolean;
};

export const postChat = async (question: string): Promise<ChatResult> => {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(`Chat failed (${res.status})`);
  return (await res.json()) as ChatResult;
};

export const fetchSource = async (
  id: string,
): Promise<{ code: string; lang: string } | null> => {
  const res = await fetch(`/api/node/${encodeURIComponent(id)}/source`);
  if (!res.ok) return null;
  return (await res.json()) as { code: string; lang: string };
};
