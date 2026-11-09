import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environmentSchema } from '@repo/protocol';

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

  it('reports a change that fails, and keeps taking changes after it', async () => {
    const reportError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await machines.selectEnvironment('no-such-environment');
    await machines.selectGroups(['group-a']);

    expect(reportError).toHaveBeenCalledOnce();
    expect(machines.state.processes).toHaveLength(1);
  });
});
