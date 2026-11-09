const host = '127.0.0.1';
const supervisorUrl = process.env.SUPERVISOR_URL ?? 'http://127.0.0.1:4000';

export const CONFIG = {
  SERVICES: {
    HOST: host,
    SUPERVISOR_URL: supervisorUrl,
  },
  UPDATES: {
    MACHINE_SYNC_HZ: 60,
  },
  MACHINE: {
    COLLISION_THRESHOLD: 0.08, // How close two bobs' surfaces get before they've collided, in metres.
    DEFINITION: process.env.MACHINE_DEFINITION,
  },
};
