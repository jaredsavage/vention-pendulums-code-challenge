import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { basename } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import {
  machinePropertiesSchema,
  type Environment,
  type MachineProperties,
} from '@repo/protocol';
import { CONFIG } from '../../config.ts';
import type { MachineProcess, SimManagerState } from '../state.ts';
import { environmentNames, readEnvironment } from './environments.ts';
import {
  createGroupFile,
  readGroupNames,
  writeGroupMembers,
  type MachineSnapshot,
} from './groupFiles.ts';
import {
  addedMachine,
  numberedMachine,
  readGroupMachines,
  type MachineDefinition,
} from './machineDefinitions.ts';

const HEALTH_POLL_MS = 100;
const REQUEST_TIMEOUT_MS = 2000;
// In a big group, some machines never finish closing after a shutdown request.
const STOP_TIMEOUT_MS = 3000;

// Machines run on the same Node as Sim Manager: node.exe on Windows.
const MACHINE_RUNTIME = process.execPath;
const MACHINE_RUNTIME_NAME = basename(MACHINE_RUNTIME);

export type StateListener = (state: SimManagerState) => void;

// Keeps the machines of the selected groups running, starting and stopping
// only what changes. It's the only thing that stops them. Saving and copying
// groups go through it too, since they read from the running machines.
export class MachineProcesses {
  private current = initialState();
  private readonly children = new Map<string, ChildProcess>();
  private readonly onChange: StateListener;
  private changes = Promise.resolve();

  constructor(onChange: StateListener) {
    this.onChange = onChange;
  }

  // Read-only from outside. Only update() changes it, and it tells the
  // listener each time.
  get state() {
    return this.current;
  }

  // What's wanted changes at once, so choices made during a launch all count.
  selectGroups(names: string[]) {
    const { groups } = this.state;
    const selectedGroups = groups.filter((name) => names.includes(name));

    this.update({ selectedGroups });

    return this.oneAtATime(() => this.matchSelectedGroups());
  }

  selectEnvironment(environment: string) {
    return this.oneAtATime(() => this.applyEnvironment(environment));
  }

  changeEnvironment(changes: Partial<Environment>) {
    return this.oneAtATime(() => this.applyChanges(changes));
  }

  // A snapshot of the group as it's running now, saved over its own file.
  updateGroupFile(groupFile: string) {
    return this.oneAtATime(() => this.saveRunningGroup(groupFile));
  }

  // A new group, started straight away: one pendulum, or a copy of a running
  // group as it is now.
  createGroup(name: string, copyOf?: string) {
    return this.oneAtATime(() => this.addGroup(name, copyOf));
  }

  // One more machine in a running group, a copy of its rightmost one.
  addMachine(groupFile: string) {
    return this.oneAtATime(() => this.launchNextInLine(groupFile));
  }

  endProcess(id: string) {
    const ending = this.state.processes.filter((machine) => machine.id === id);

    return this.oneAtATime(() => this.stopProcesses(ending));
  }

  close() {
    return this.oneAtATime(() => this.stopProcesses(this.state.processes));
  }

  // Changes run in order, one at a time. One that fails, like a group file
  // that doesn't parse, is reported, and the changes after it still run.
  private oneAtATime(change: () => Promise<void>) {
    this.changes = this.changes.then(change).catch(console.error);

    return this.changes;
  }

  private async matchSelectedGroups() {
    const { selectedGroups, processes } = this.state;
    const wanted = new Set(selectedGroups);
    const running = new Set(processes.map(({ groupFile }) => groupFile));
    const toLaunch = selectedGroups.filter((group) => !running.has(group));
    const toStop = processes.filter(({ groupFile }) => !wanted.has(groupFile));

    await this.stopProcesses(toStop);
    await Promise.all(toLaunch.map((groupFile) => this.launch(groupFile)));
  }

  private async launch(groupFile: string) {
    const { environmentValues: environment } = this.state;
    const takeNumber = this.numberTaker();
    const definitions = readGroupMachines(groupFile, environment, takeNumber);

    await this.startAll(groupFile, definitions);
  }

  private async launchNextInLine(groupFile: string) {
    const { environmentValues: environment } = this.state;
    const snapshots = await this.snapshotGroup(groupFile);
    const properties = nextInLine(snapshots);
    const takeNumber = this.numberTaker();
    const number = takeNumber();
    const member = { number, givenName: undefined, properties };
    const definition = addedMachine(groupFile, member, environment);

    await this.startAll(groupFile, [definition]);
  }

  private async startAll(groupFile: string, definitions: MachineDefinition[]) {
    const launched = definitions.map((definition) =>
      launchedProcess(definition, groupFile),
    );

    this.update({ processes: [...this.state.processes, ...launched] });
    await Promise.all(definitions.map((definition) => this.start(definition)));
  }

  // A group's machines are numbered as they're read, each taking the lowest
  // number nothing else is using.
  private numberTaker() {
    const taken = new Set(this.state.processes.map(({ number }) => number));

    return () => {
      let number = 1;
      while (taken.has(number)) {
        number += 1;
      }

      taken.add(number);

      return number;
    };
  }

  private async start(definition: MachineDefinition) {
    const { id, url } = definition.machine;
    const child = spawnMachine(definition);

    this.children.set(id, child);
    this.updateProcess(id, { pid: child.pid ?? null });
    child.once('exit', () => {
      this.children.delete(id);
      this.removeProcess(id);
    });

    await this.markOnlineOnceHealthy(id, url);
  }

  // Gives up if the process exits first.
  private async markOnlineOnceHealthy(id: string, url: string) {
    while (this.children.has(id)) {
      if (await isHealthy(url)) {
        this.updateProcess(id, { online: true });

        return;
      }

      await delay(HEALTH_POLL_MS);
    }
  }

  private async applyEnvironment(environment: string) {
    const environmentValues = readEnvironment(environment);

    this.update({ environment, environmentValues });
    await this.sendToMachines(environmentValues);
  }

  private async applyChanges(changes: Partial<Environment>) {
    const environmentValues = { ...this.state.environmentValues, ...changes };

    this.update({ environmentValues });
    await this.sendToMachines(changes);
  }

  private async sendToMachines(changes: Partial<Environment>) {
    const { processes } = this.state;
    const body = JSON.stringify(changes);
    const requests = processes.map(({ url }) => postEnvironment(url, body));

    await Promise.allSettled(requests);
  }

  private async saveRunningGroup(groupFile: string) {
    const snapshots = await this.snapshotGroup(groupFile);

    writeGroupMembers(groupFile, snapshots);
  }

  // The new group is selected along with the others, so it starts.
  private async addGroup(name: string, copyOf: string | undefined) {
    const copies = copyOf ? await this.snapshotGroup(copyOf) : undefined;
    const fileName = createGroupFile(name, copies);

    const groups = readGroupNames();
    const selectedGroups = [...this.state.selectedGroups, fileName];

    this.update({ groups, selectedGroups });
    await this.matchSelectedGroups();
  }

  // Every machine has to answer, or nothing is saved.
  private snapshotGroup(groupFile: string) {
    const members = this.state.processes.filter(
      (machine) => machine.groupFile === groupFile,
    );

    return Promise.all(members.map(readSnapshot));
  }

  private async stopProcesses(processes: MachineProcess[]) {
    await Promise.all(processes.map((machine) => this.stop(machine)));
  }

  private async stop({ id, url }: MachineProcess) {
    const child = this.children.get(id);
    if (!child) return;

    const exited = once(child, 'exit');

    await requestShutdown(url, child);
    await Promise.race([exited, delay(STOP_TIMEOUT_MS)]);
    child.kill();
    await exited;
  }

  // However a process ended, a group file with none left is no longer
  // selected, so the next change doesn't launch it again.
  private removeProcess(id: string) {
    const { processes, selectedGroups } = this.state;
    const endedGroup = processes.find((ended) => ended.id === id)?.groupFile;
    const remaining = processes.filter((machine) => machine.id !== id);
    const groupsLeft = new Set(remaining.map(({ groupFile }) => groupFile));
    const stillSelected = selectedGroups.filter(
      (group) => group !== endedGroup || groupsLeft.has(group),
    );

    this.update({ processes: remaining, selectedGroups: stillSelected });
  }

  private updateProcess(id: string, changes: Partial<MachineProcess>) {
    const processes = this.state.processes.map((machine) =>
      machine.id === id ? { ...machine, ...changes } : machine,
    );

    this.update({ processes });
  }

  private update(changes: Partial<SimManagerState>) {
    this.current = { ...this.current, ...changes };
    this.onChange(this.state);
  }
}

// Nothing running yet, in the first environment.
function initialState(): SimManagerState {
  const environment = environmentNames[0]!;

  return {
    supervisorUrl: CONFIG.SUPERVISOR_URL,
    groups: readGroupNames(),
    selectedGroups: [],
    environments: environmentNames,
    environment,
    environmentValues: readEnvironment(environment),
    processes: [],
  };
}

// How a machine shows on the page until it's started and answering.
function launchedProcess(
  { number, groupId, machine }: MachineDefinition,
  groupFile: string,
): MachineProcess {
  const { id, name, url } = machine;

  return {
    id,
    number,
    groupFile,
    groupId,
    name,
    url,
    program: MACHINE_RUNTIME_NAME,
    pid: null,
    online: false,
  };
}

// The IPC channel closes when this process dies, however it dies.
function spawnMachine(definition: MachineDefinition) {
  const processVariables = {
    ...process.env,
    SUPERVISOR_URL: CONFIG.SUPERVISOR_URL,
    MACHINE_DEFINITION: JSON.stringify(definition),
  };

  return spawn(MACHINE_RUNTIME, [CONFIG.MACHINE_PROGRAM], {
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    env: processVariables,
    windowsHide: true,
  });
}

async function isHealthy(url: string) {
  try {
    const response = await fetch(`${url}/api/health`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    return response.ok;
  } catch {
    return false;
  }
}

// A copy of the rightmost machine, one spacing further right: the gap between
// the last two, or the width of a full swing when there's only one.
function nextInLine(snapshots: MachineSnapshot[]): MachineProperties {
  const leftToRight = snapshots
    .map(({ properties }) => properties)
    .toSorted((a, b) => a.anchor.x - b.anchor.x);
  const last = leftToRight.at(-1)!;
  const previous = leftToRight.at(-2);

  const fullSwing = 2 * (last.length + last.radius);
  const spacing = previous ? last.anchor.x - previous.anchor.x : fullSwing;
  const nextX = last.anchor.x + spacing;
  const centimetres = Math.round(nextX * 100);
  const anchor = { x: centimetres / 100, y: last.anchor.y };

  return { ...last, anchor };
}

// A name that's just the machine's number wasn't given by its group file.
async function readSnapshot({
  number,
  name,
  url,
}: MachineProcess): Promise<MachineSnapshot> {
  const response = await fetch(`${url}/api/properties`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const properties = machinePropertiesSchema.parse(await response.json());
  const numbered = numberedMachine(number, undefined);
  const givenName = name === numbered.name ? undefined : name;

  return { givenName, properties };
}

async function postEnvironment(url: string, body: string) {
  await fetch(`${url}/api/environment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

// A machine that shuts itself down gets to leave the supervisor properly.
async function requestShutdown(url: string, child: ChildProcess) {
  try {
    await fetch(`${url}/api/shutdown`, {
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    child.kill();
  }
}
