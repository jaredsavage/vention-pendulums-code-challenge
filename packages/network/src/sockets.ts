import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { io } from 'socket.io-client';

// WebSocket only, at both ends. A server that only takes WebSocket can't talk
// to a client that starts with polling.
const TRANSPORTS = ['websocket' as const];
const MAX_MESSAGE_BYTES = 32 * 1024;
const PING_INTERVAL_MS = 1000;
const PING_TIMEOUT_MS = 2000;
const RECONNECT_DELAY_MS = 200;
const MAX_RECONNECT_DELAY_MS = 1000;

export function createSocketServer(http: HttpServer) {
  return new Server(http, {
    transports: TRANSPORTS,
    maxHttpBufferSize: MAX_MESSAGE_BYTES,
    pingInterval: PING_INTERVAL_MS,
    pingTimeout: PING_TIMEOUT_MS,
  });
}

// Introduces itself with auth, and keeps reconnecting until it's closed.
export function connectSocket(url: string, auth: Record<string, unknown>) {
  return io(url, {
    transports: TRANSPORTS,
    auth,
    reconnectionDelay: RECONNECT_DELAY_MS,
    reconnectionDelayMax: MAX_RECONNECT_DELAY_MS,
  });
}
