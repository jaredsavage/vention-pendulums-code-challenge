import { CONFIG } from '../../config.ts';
import type { SimManagerState } from '../state.ts';
import { startSimManager } from './server.ts';

const simManagerUrl = `http://${CONFIG.HOST}:${CONFIG.PORT}`;
let shownStatus = '';

// The terminal is Sim Manager's: where everything is, and how many machines
// are running. It's only redrawn when that changes.
function showStatus({ supervisorUrl, processes }: SimManagerState) {
  const running = processes.filter(({ online }) => online).length;
  const status = [
    `Supervisor   ${supervisorUrl}`,
    `Sim Manager  ${simManagerUrl}`,
    `Machines     ${running} running`,
    '',
    'Ctrl+C to stop.',
  ].join('\n');

  if (status === shownStatus) return;

  shownStatus = status;
  console.clear();
  console.log(status);
}

const simManager = await startSimManager(showStatus);

function shutdown() {
  void simManager.close();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
