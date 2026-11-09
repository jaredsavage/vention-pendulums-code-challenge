import { CONFIG } from '../../config.ts';
import { parseMachineDefinition } from './definition.ts';
import { startMachine } from './server.ts';

const definition = parseMachineDefinition(CONFIG.MACHINE.DEFINITION);
const supervisorUrl = CONFIG.SERVICES.SUPERVISOR_URL;

// However many ways it's asked to, the machine only closes once.
let closing = false;

function shutdown() {
  if (closing) return;

  closing = true;
  void service.close();
}

const service = await startMachine(definition, supervisorUrl, shutdown);
console.log(`${definition.machine.id} listening at ${definition.machine.url}`);

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

// To prevent orphans on macOS and Linux, where a manager that's killed
// outright leaves its machines running. The channel alone mustn't keep
// a machine alive.
process.channel?.unref();
process.once('disconnect', shutdown);
