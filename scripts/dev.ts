// Starts the supervisor in the background, then runs Sim Manager in this
// terminal. Stopping Sim Manager stops the supervisor too.
// --only=supervisor or --only=sim-manager starts just the one.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { CONFIG } from '../apps/supervisor/config.ts';
import { findAvailablePort } from './findAvailablePort.ts';

const APPS = join(import.meta.dirname, '../apps');
const SUPERVISOR_PROGRAM = join(APPS, 'supervisor/src/server/index.ts');
const SIM_MANAGER_PROGRAM = join(APPS, 'sim-manager/src/server/index.ts');

const { SERVICES } = CONFIG;
const { values } = parseArgs({ options: { only: { type: 'string' } } });
const withSupervisor = values.only !== 'sim-manager';
const withSimManager = values.only !== 'supervisor';

// On its own, Sim Manager joins whichever supervisor SUPERVISOR_URL names.
const environment = withSupervisor
  ? await localSupervisorEnvironment()
  : process.env;

const supervisor = withSupervisor ? startSupervisor() : null;

if (withSimManager) {
  await runSimManager();
  supervisor?.kill();
} else {
  console.log(`Supervisor at ${environment.SUPERVISOR_URL}. Ctrl+C to stop.`);
  process.once('SIGINT', () => supervisor?.kill());
}

// A supervisor started here keeps its usual port when it's free, and finds the
// next one when it isn't. Everything started here is told where it is.
async function localSupervisorEnvironment() {
  const port = await findAvailablePort(SERVICES.HOST, SERVICES.PORT);
  const url = `http://${SERVICES.HOST}:${port}`;

  return {
    ...process.env,
    SUPERVISOR_PORT: String(port),
    SUPERVISOR_URL: url,
    SUPERVISOR_HOT_RELOAD: 'true',
  };
}

function startSupervisor() {
  return spawn(process.execPath, [SUPERVISOR_PROGRAM], {
    stdio: ['ignore', 'ignore', 'inherit'],
    env: environment,
    windowsHide: true,
  });
}

// Ctrl+C reaches Sim Manager too, so this waits for it to stop its machines.
async function runSimManager() {
  const simManager = spawn(process.execPath, [SIM_MANAGER_PROGRAM], {
    stdio: 'inherit',
    env: environment,
  });

  process.on('SIGINT', () => undefined);
  await once(simManager, 'exit');
}
