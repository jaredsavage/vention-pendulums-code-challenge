import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer, type AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, it, vi } from 'vitest';
import {
  supervisorStateSchema,
  type Command,
  type ObservedMachine,
} from '@repo/protocol';
import { testGroup } from '../apps/sim-machine/tests/fixtures.ts';

const GROUP = 'collision-test';
const FIRST_RUN = 'first-run';
const supervisorProgram = fileURLToPath(
  new URL('../apps/supervisor/src/server/index.ts', import.meta.url),
);
const machineProgram = fileURLToPath(
  import.meta.resolve('@repo/sim-machine/program'),
);

const processes: ChildProcess[] = [];
let supervisorUrl = '';

afterEach(async () => {
  for (const child of processes.splice(0).reverse()) {
    const exited = child.exitCode !== null || child.signalCode !== null;
    if (!exited) {
      child.kill();
      await once(child, 'exit');
    }
  }
});

// The same entry points used by the demo, with one process per machine.
it('stops and restarts the whole group after a collision, including a distant machine', async () => {
  await startSupervisor();

  // Two pendulums that touch, and one too far away to touch either.
  const anchors = [0, 0.1, 100];
  for (const [index, anchorX] of anchors.entries()) {
    await startMachine(index + 1, anchorX);
  }
  await waitForMachines(({ state }) => state?.connectedPeers.length === 2);

  // Collision stopping starts off, so the group can get running first.
  await groupCommand({ type: 'START', runId: FIRST_RUN, resume: false });
  await waitForMachines(({ state }) => state?.status === 'running');

  await groupCommand({ type: 'SET_COLLISION_STOPPING', enabled: true });
  const stopped = await waitForMachines(
    ({ state }) => state?.status === 'restart-countdown',
  );
  const restartAt = Math.min(...stopped.map(({ state }) => state!.restartAt!));

  const restarted = await waitForMachines(
    ({ state }) => state?.runId !== FIRST_RUN,
  );
  const runs = new Set(restarted.map(({ state }) => state!.runId));

  expect(runs.size).toBe(1);
  expect(Date.now()).toBeGreaterThanOrEqual(restartAt);
});

async function startSupervisor() {
  const port = await freePort();
  supervisorUrl = `http://127.0.0.1:${port}`;

  launch(supervisorProgram, {
    SUPERVISOR_HOST: '127.0.0.1',
    SUPERVISOR_PORT: String(port),
    SUPERVISOR_HOT_RELOAD: 'false',
  });
  await vi.waitFor(
    async () => {
      const response = await fetch(`${supervisorUrl}/api/health`);
      expect(response.ok).toBe(true);
    },
    { timeout: 10000 },
  );
}

async function startMachine(number: number, anchorX: number) {
  const { environment, machines } = testGroup();
  const template = machines[0]!;
  const port = await freePort();
  const machine = {
    ...template,
    id: `machine-${number}`,
    name: `Machine ${number}`,
    url: `http://127.0.0.1:${port}`,
    properties: {
      ...template.properties,
      anchor: { x: anchorX, y: 0 },
      initialAngle: 0,
    },
  };
  const definition = {
    groupId: GROUP,
    machine,
    port,
    environment,
    stopOnCollision: false,
  };

  launch(machineProgram, {
    SUPERVISOR_URL: supervisorUrl,
    MACHINE_DEFINITION: JSON.stringify(definition),
  });
}

async function groupCommand(command: Command) {
  const response = await fetch(`${supervisorUrl}/api/groups/${GROUP}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });

  expect(await response.json()).toEqual({ ok: true });
}

// Waits until all three machines report what's expected, then returns them.
async function waitForMachines(
  expected: (machine: ObservedMachine) => boolean,
) {
  return vi.waitFor(
    async () => {
      const response = await fetch(`${supervisorUrl}/api/state`);
      const snapshot = supervisorStateSchema.parse(await response.json());
      const machines = snapshot.groups.flatMap((group) => group.machines);

      expect(machines).toHaveLength(3);
      expect(machines.every(expected)).toBe(true);

      return machines;
    },
    { timeout: 10000 },
  );
}

function launch(program: string, environment: NodeJS.ProcessEnv) {
  const child = spawn(process.execPath, [program], {
    env: { ...process.env, ...environment },
    stdio: ['ignore', 'ignore', 'inherit'],
    windowsHide: true,
  });

  processes.push(child);
}

async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  server.close();
  await once(server, 'close');

  return port;
}
