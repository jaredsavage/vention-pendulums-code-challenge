const host = process.env.SUPERVISOR_HOST ?? '127.0.0.1';
const port = Number(process.env.SUPERVISOR_PORT ?? 4000);

export const CONFIG = {
  SERVICES: {
    HOST: host,
    PORT: port,
    URL: `http://${host}:${port}`,
  },
  UPDATES: {
    BROWSER_UPDATE_HZ: 60,
  },
  HOT_RELOAD: process.env.SUPERVISOR_HOT_RELOAD === 'true', // Serves the client through Vite.
};
