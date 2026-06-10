import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { GraphPatch } from '@repo/code-graph-core';
import type { GraphService } from './graph-service.js';

type ServerMessage =
  | { kind: 'snapshot-ready'; nodeCount: number; edgeCount: number }
  | { kind: 'patch'; patch: GraphPatch };

const send = (socket: WebSocket, message: ServerMessage): void => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
};

export const attachWsHub = (server: Server, graph: GraphService): void => {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket) => {
    const snapshot = graph.getSnapshot();
    if (snapshot) {
      send(socket, {
        kind: 'snapshot-ready',
        nodeCount: snapshot.meta.nodeCount,
        edgeCount: snapshot.meta.edgeCount,
      });
    }
  });

  graph.onPatch((patch) => {
    for (const client of wss.clients) {
      send(client, { kind: 'patch', patch });
    }
  });
};
