import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const host = process.env.SIM_MANAGER_HOST ?? '127.0.0.1';
const port = Number(process.env.SIM_MANAGER_PORT ?? 4050);
const supervisorUrl = process.env.SUPERVISOR_URL ?? 'http://127.0.0.1:4000';
const dataDirectory =
  process.env.SIM_MANAGER_DATA ?? join(import.meta.dirname, 'data');
const machinePortStart = Number(process.env.MACHINE_PORT_START ?? 4101);

// Sim Machine is a separate program, found by its package name.
const machineProgram = fileURLToPath(
  import.meta.resolve('@repo/sim-machine/program'),
);

export const CONFIG = {
  HOST: host,
  PORT: port,
  SUPERVISOR_URL: supervisorUrl,
  DATA_DIRECTORY: dataDirectory,
  MACHINE_PORT_START: machinePortStart,
  MACHINE_PROGRAM: machineProgram,
};
