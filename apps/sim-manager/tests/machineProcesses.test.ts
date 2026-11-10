import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
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
import { environmentSchema } from '@repo/protocol';

// Sim Manager reads its config when it's imported, so first point it at the
// fixture groups, and its machines at ports away from a running demo. Nothing
// listens on its own port here, so machines can't save to a running demo.
const fixtures = fileURLToPath(new URL('./fixtures/', import.meta.url));
process.env.SIM_MANAGER_DATA = fixtures;
process.env.SIM_MANAGER_PORT = '4620';
process.env.MACHINE_PORT_START = '4600';
const { MachineProcesses } = await import('../src/server/machineProcesses.ts');

// Long enough for a group to be saved, a moment after its last change.
const SAVED = { timeout: 3000 };

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

// A fixture group file a test may save over, put back once it's done.
function keptGroupFile(fileName: string) {
  const path = join(fixtures, 'groups', `${fileName}.json`);
  const original = readFileSync(path, 'utf8');
  onTestFinished(() => writeFileSync(path, original));

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

  // Each change pushes the save back, so a drag is written once, at the end.
  it('keeps what a machine sends, and saves its group a moment later', async () => {
    const groupFile = keptGroupFile('group-a');
    const original = readFileSync(groupFile, 'utf8');

    await machines.selectGroups(['group-a']);
    const { id, properties } = machines.state.processes[0]!;
    machines.keepSettings(id, { ...properties, length: 1.2 });
    await delay(150);
    machines.keepSettings(id, { ...properties, length: 1.5 });
    await delay(150);
    expect(readFileSync(groupFile, 'utf8')).toBe(original);

    // Its numbered name isn't saved, and its drag coefficient now is.
    await expect
      .poll(() => readGroupFile(groupFile), SAVED)
      .toEqual({
        id: 'group-a',
        stopOnCollision: true,
        members: [
          {
            anchor: { x: 0, y: -3 },
            length: 1.5,
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
    expect(machines.state.groups).toContainEqual({
      file: 'new-group',
      id: 'New group',
    });
    expect(machines.state.processes).toEqual([
      expect.objectContaining({ groupFile: 'new-group', online: true }),
    ]);
  });

  it('duplicates a group under a new name, running or not', async () => {
    const groupFile = newGroupFile('copy-of-a');

    await machines.createGroup('Copy of A', 'group-a');

    expect(readGroupFile(groupFile)).toMatchObject({
      id: 'Copy of A',
      members: [{ anchor: { x: 0, y: -3 }, length: 1, radius: 0.1 }],
    });
  });

  it('renames a group that is off, file and all', async () => {
    const before = newGroupFile('before');
    const after = newGroupFile('after');

    await machines.createGroup('Before');
    await machines.selectGroups([]);
    await machines.renameGroup('before', 'After');

    expect(existsSync(before)).toBe(false);
    expect(readGroupFile(after)).toMatchObject({ id: 'After' });
    expect(machines.state.groups).toContainEqual({
      file: 'after',
      id: 'After',
    });
  });

  it('picks up a group file added by hand when it reloads', () => {
    const groupFile = newGroupFile('by-hand');
    writeFileSync(groupFile, JSON.stringify({ id: 'By hand', members: [] }));

    machines.reloadGroups();

    expect(machines.state.groups).toContainEqual({
      file: 'by-hand',
      id: 'By hand',
    });
  });

  it('deletes a group, stopping its machines first', async () => {
    const groupFile = newGroupFile('unwanted');

    await machines.createGroup('Unwanted');
    await machines.deleteGroup('unwanted');

    expect(existsSync(groupFile)).toBe(false);
    expect(machines.state.groups).not.toContainEqual(
      expect.objectContaining({ file: 'unwanted' }),
    );
    expect(machines.state.processes).toEqual([]);
  });

  it('deletes a group when its last machine is destroyed', async () => {
    const groupFile = newGroupFile('doomed');

    await machines.createGroup('Doomed');
    const [lastMachine] = machines.state.processes;
    machines.removeMachine(lastMachine!.id);

    await expect.poll(() => existsSync(groupFile), SAVED).toBe(false);
    expect(machines.state.groups).not.toContainEqual(
      expect.objectContaining({ file: 'doomed' }),
    );
    expect(machines.state.processes).toEqual([]);
  });

  // Shutting a machine down only stops it, so a later save keeps its entry.
  it('keeps a shut-down machine in its group file when others change', async () => {
    const groupFile = keptGroupFile('group-a');

    await machines.selectGroups(['group-a']);
    await machines.addMachine('group-a');
    const [first, second] = machines.state.processes;
    await machines.endProcess(second!.id);
    machines.keepSettings(first!.id, { ...first!.properties, length: 1.5 });

    await expect
      .poll(() => readGroupFile(groupFile), SAVED)
      .toMatchObject({
        members: [{ length: 1.5 }, { anchor: { x: 2.2, y: -3 } }],
      });
  });

  it('takes a destroyed machine out of its group file', async () => {
    const groupFile = keptGroupFile('group-a');
    const memberCount = () => {
      const { members } = readGroupFile(groupFile) as { members: unknown[] };

      return members.length;
    };

    await machines.selectGroups(['group-a']);
    await machines.addMachine('group-a');
    await expect.poll(memberCount, SAVED).toBe(2);

    const added = machines.state.processes.find(({ number }) => number === 2)!;
    machines.removeMachine(added.id);

    await expect.poll(() => machines.state.processes, SAVED).toHaveLength(1);
    await expect.poll(memberCount, SAVED).toBe(1);
  });

  // The first deletion moves the entries after it up, so the second has to
  // find its entry where the first left it.
  it('deletes the right entries when two deletions arrive together', async () => {
    const groupFile = keptGroupFile('group-a');

    await machines.selectGroups(['group-a']);
    await machines.addMachine('group-a');
    await machines.addMachine('group-a');
    const [first, second] = machines.state.processes;
    machines.removeMachine(first!.id);
    machines.removeMachine(second!.id);

    // One at a time, each waiting to leave a supervisor that isn't there.
    const bothStopped = { timeout: 10_000 };
    await expect
      .poll(() => machines.state.processes, bothStopped)
      .toHaveLength(1);
    expect(readGroupFile(groupFile)).toMatchObject({
      members: [{ anchor: { x: 4.4, y: -3 } }],
    });
  });

  it('adds a machine to a group that is off, in its file', async () => {
    const groupFile = keptGroupFile('group-a');

    await machines.addMachine('group-a');
    const { members } = readGroupFile(groupFile) as {
      members: { anchor: unknown }[];
    };

    expect(members.map(({ anchor }) => anchor)).toEqual([
      { x: 0, y: -3 },
      { x: 2.2, y: -3 },
    ]);
    expect(machines.state.processes).toEqual([]);
  });

  it('adds a machine clear of a lone one, and ends it again', async () => {
    keptGroupFile('group-a');

    await machines.selectGroups(['group-a']);
    await machines.addMachine('group-a');
    const { processes } = machines.state;
    const added = processes.find(({ number }) => number === 2)!;

    // A 1 m string and a 0.1 m bob sweep 2.2 m across in a full swing.
    expect(added.properties.anchor).toEqual({ x: 2.2, y: -3 });

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
