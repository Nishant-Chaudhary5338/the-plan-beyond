import { GraphSnapshot, type NodeKnowledge } from '@repo/code-graph-core';

export const fetchGraph = async (): Promise<GraphSnapshot> => {
  const res = await fetch('/api/graph');
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
