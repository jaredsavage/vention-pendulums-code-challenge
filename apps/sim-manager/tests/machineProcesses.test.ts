import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vitest';
import { environmentSchema, machinePropertiesSchema } from '@repo/protocol';

// Sim Manager reads its config when it's imported, so first point it at the
// fixture groups, and its machines at ports away from a running demo.
const fixtures = fileURLToPath(new URL('./fixtures/', import.meta.url));
process.env.SIM_MANAGER_DATA = fixtures;
process.env.MACHINE_PORT_START = '4600';
const { MachineProcesses } = await import('../src/server/machineProcesses.ts');

let machines: InstanceType<typeof MachineProcesses>;

beforeEach(() => {
  machines = new MachineProcesses(() => undefined);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await machines.close();
});

function pids() {
  return machines.state.processes.map(({ pid }) => pid);
}

// A group file the test makes, removed again once it's done.
function newGroupFile(fileName: string) {
  const path = join(fixtures, 'groups', `${fileName}.json`);
  onTestFinished(() => rmSync(path, { force: true }));

  return path;
}

function readGroupFile(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// These launch real machine processes, rather than mocking process control.
describe('Sim Manager', () => {
  it('leaves one group running while another changes', async () => {
    await machines.selectGroups(['group-a']);
    const [groupA] = machines.state.processes;
    expect(groupA).toMatchObject({ groupFile: 'group-a', online: true });

    await machines.selectGroups(['group-a', 'group-b']);
    expect(machines.state.processes).toHaveLength(2);
    expect(machines.state.processes).toContainEqual(groupA);

    await machines.selectGroups(['group-a']);
    expect(machines.state.processes).toEqual([groupA]);
  });

  it('changes the environment without replacing the running machines', async () => {
    await machines.selectGroups(['group-a']);
    const pidsBefore = pids();
    const machineUrl = machines.state.processes[0]!.url;

    await machines.changeEnvironment({ gravity: 1.62 });
    const response = await fetch(`${machineUrl}/api/environment`);
    const environment = environmentSchema.parse(await response.json());

    expect(environment.gravity).toBe(1.62);
    expect(pids()).toEqual(pidsBefore);
  });

  it('saves a running group back to its own file', async () => {
    const groupFile = join(fixtures, 'groups/group-a.json');
    const original = readFileSync(groupFile, 'utf8');
    onTestFinished(() => writeFileSync(groupFile, original));

    await machines.selectGroups(['group-a']);
    await machines.updateGroupFile('group-a');
    const saved: unknown = JSON.parse(readFileSync(groupFile, 'utf8'));

    // Its numbered name isn't saved, and its drag coefficient now is.
    expect(saved).toEqual({
      id: 'group-a',
      stopOnCollision: true,
      members: [
        {
          anchor: { x: 0, y: -3 },
          length: 1,
          initialAngle: 15,
          radius: 0.1,
          mass: 1,
          dragCoefficient: 0.47,
        },
      ],
    });
  });

  it('creates a group with one pendulum, and starts it', async () => {
    const groupFile = newGroupFile('new-group');

    await machines.createGroup('New group');

    expect(readGroupFile(groupFile)).toMatchObject({
      id: 'New group',
      members: [expect.any(Object)],
    });
    expect(machines.state.groups).toContain('new-group');
    expect(machines.state.processes).toEqual([
      expect.objectContaining({ groupFile: 'new-group', online: true }),
    ]);
  });

  it('copies a running group under a new name', async () => {
    const groupFile = newGroupFile('copy-of-a');

    await machines.selectGroups(['group-a']);
    await machines.createGroup('Copy of A', 'group-a');

    expect(readGroupFile(groupFile)).toMatchObject({
      id: 'Copy of A',
      members: [{ anchor: { x: 0, y: -3 }, length: 1, radius: 0.1 }],
    });
  });

  it('adds a machine clear of a lone one, and ends it again', async () => {
    await machines.selectGroups(['group-a']);
    await machines.addMachine('group-a');
    const { processes } = machines.state;
    const added = processes.find(({ number }) => number === 2)!;
    const response = await fetch(`${added.url}/api/properties`);
    const properties = machinePropertiesSchema.parse(await response.json());

    // A 1 m string and a 0.1 m bob sweep 2.2 m across in a full swing.
    expect(properties.anchor).toEqual({ x: 2.2, y: -3 });

    await machines.endProcess(added.id);

    expect(machines.state.processes).toHaveLength(1);
  });

  it('reports a change that fails, and keeps taking changes after it', async () => {
    const reportError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await machines.selectEnvironment('no-such-environment');
    await machines.selectGroups(['group-a']);

    expect(reportError).toHaveBeenCalledOnce();
    expect(machines.state.processes).toHaveLength(1);
  });
});
