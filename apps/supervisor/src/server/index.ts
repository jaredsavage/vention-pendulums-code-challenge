import { CONFIG } from '../../config.ts';
import { startSupervisor } from './server.ts';

const supervisor = await startSupervisor();
console.log(`Supervisor listening at ${CONFIG.SERVICES.URL}`);

function shutdown() {
  void supervisor.close();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
