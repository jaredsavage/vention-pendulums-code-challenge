import type { Server } from 'node:http';
import { join } from 'node:path';
import express, { type Express } from 'express';
import { CONFIG } from '../../config.ts';

const APP_DIRECTORY = join(import.meta.dirname, '../..');
const BUILD_DIRECTORY = join(APP_DIRECTORY, 'dist');

// Serves the supervisor client: the built copy, or Vite's live one while
// developing. Returns Vite, when it's running, so it can be closed.
export async function servePage(app: Express, http: Server) {
  if (!CONFIG.HOT_RELOAD) {
    app.use(express.static(BUILD_DIRECTORY));

    return null;
  }

  const { createServer } = await import('vite');
  const vite = await createServer({
    root: APP_DIRECTORY,
    // The browser shows errors; the terminal belongs to Sim Manager.
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: { server: http } },
  });
  app.use(vite.middlewares);

  return vite;
}
