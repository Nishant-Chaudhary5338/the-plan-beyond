import { GraphPatch } from '@repo/code-graph-core';

type ServerMessage =
  | { kind: 'snapshot-ready'; nodeCount: number; edgeCount: number }
  | { kind: 'patch'; patch: unknown };

export type WsHandlers = {
  onPatch: (patch: GraphPatch) => void;
};

export const connectWs = (handlers: WsHandlers): (() => void) => {
  const url = `ws://${window.location.host}/ws`;
  const socket = new WebSocket(url);

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data as string) as ServerMessage;
    if (message.kind === 'patch') {
      const parsed = GraphPatch.safeParse(message.patch);
      if (parsed.success) handlers.onPatch(parsed.data);
    }
  });

  return () => socket.close();
};
