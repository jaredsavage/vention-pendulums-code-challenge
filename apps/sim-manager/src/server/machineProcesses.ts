import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import type { Environment, MachineProperties } from '@repo/protocol';
import { CONFIG } from '../../config.ts';
import type { MachineProcess, SimManagerState } from '../state.ts';
import {
  createGroupFile,
  deleteGroupFile,
  environmentNames,
  readEnvironment,
  readGroup,
  readMembers,
  readSavedGroups,
  renameGroupFile,
  writeGroupMembers,
  type GroupMember,
} from './files.ts';
import {
  askMachine,
  isHealthy,
  prepareLaunch,
  spawnMachine,
  type MachineDefinition,
  type PlacedMember,
} from './machineLaunch.ts';

const HEALTH_POLL_MS = 100;
const STOP_TIMEOUT_MS = 3000;
// Wait until edits pause before writing the group file.
const SAVE_DELAY_MS = 250;

export type StateListener = (state: SimManagerState) => void;

// Starts and stops machine processes, and saves reported properties to their
// entries in the group files. Every change goes through one queue, so they
// happen one at a time, in the order they were asked for.
export class MachineProcesses {
  private current = initialState();
  private readonly children = new Map<string, ChildProcess>();
  private readonly onChange: StateListener;
  private changes = Promise.resolve();
  private readonly saveTimers = new Map<string, NodeJS.Timeout>();

  constructor(onChange: StateListener) {
    this.onChange = onChange;
  }

  // Read-only from outside. Only update() changes it, and it tells the
  // listener each time.
  get state() {
    return this.current;
  }

  // Running groups.

  // Update selection immediately so changes made during startup aren't lost.
  selectGroups(groupFiles: string[]) {
    const known = this.state.groups.map(({ file }) => file);
    const selectedGroups = known.filter((file) => groupFiles.includes(file));

    this.update({ selectedGroups });

    return this.oneAtATime(() => this.matchSelectedGroups());
  }

  // Group files.

  // A new group, started straight away: one pendulum, or a duplicate of
  // another group's file.
  createGroup(name: string, duplicateOf?: string) {
    return this.oneAtATime(() => this.addGroup(name, duplicateOf));
  }

  // Running machines keep their group ID until they restart, so only stopped
  // groups can be renamed.
  renameGroup(groupFile: string, name: string) {
    return this.oneAtATime(() => {
      renameGroupFile(groupFile, name);
      this.update({ groups: readSavedGroups() });
    });
  }

  // Stop the group's machine processes before deleting its files.
  deleteGroup(groupFile: string) {
    return this.oneAtATime(() => this.removeGroup(groupFile));
  }

  // Group files added or changed by hand show up.
  reloadGroups() {
    this.update({ groups: readSavedGroups() });
  }

  // Machines.

  // A copy of the rightmost machine joins the group's file. A running group
  // launches it straight away.
  addMachine(groupFile: string) {
    return this.oneAtATime(() => this.addMember(groupFile));
  }

  // Its entry stays in the group file.
  endProcess(id: string) {
    const ending = this.state.processes.filter((machine) => machine.id === id);

    return this.oneAtATime(() => this.stopProcesses(ending));
  }

  // A machine sends its properties whenever they change, and its group file is
  // saved shortly after.
  keepSettings(id: string, properties: MachineProperties) {
    const machine = this.findProcess(id);
    if (!machine) return;

    this.updateProcess(id, { properties });
    this.saveSoon(machine.groupFile);
  }

  // Deleting the last saved member also deletes the group file.
  removeMachine(id: string) {
    void this.oneAtATime(() => this.deleteMember(id));
  }

  // Environment.

  selectEnvironment(environment: string) {
    return this.oneAtATime(() => this.applyEnvironment(environment));
  }

  changeEnvironment(changes: Partial<Environment>) {
    return this.oneAtATime(() => this.applyChanges(changes));
  }

  close() {
    // Pending saves are discarded on shutdown, so recent property edits may be lost.
    for (const timer of this.saveTimers.values()) {
      clearTimeout(timer);
    }

    return this.oneAtATime(() => this.stopProcesses(this.state.processes));
  }

  // One that fails, like a group file that doesn't parse, is reported, and the
  // changes after it still run.
  private oneAtATime(change: () => void | Promise<void>) {
    this.changes = this.changes.then(change).catch(console.error);

    return this.changes;
  }

  private update(changes: Partial<SimManagerState>) {
    this.current = { ...this.current, ...changes };
    this.onChange(this.state);
  }

  // Starting and stopping.

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
    const members = readMembers(groupFile).map((member, memberIndex) => ({
      ...member,
      memberIndex,
    }));

    await this.startMembers(groupFile, members);
  }

  private async startMembers(groupFile: string, members: PlacedMember[]) {
    const group = readGroup(groupFile);
    const environment = this.state.environmentValues;
    const takeNumber = this.numberTaker();
    const launches = members.map((member) => {
      const number = takeNumber();

      return prepareLaunch({ groupFile, group, member, number, environment });
    });
    const launched = launches.map(({ machine }) => machine);

    this.update({ processes: [...this.state.processes, ...launched] });
    await Promise.all(launches.map(({ definition }) => this.start(definition)));
  }

  // Each machine takes the lowest number nothing else is using. Numbers run
  // across everything that's running, so groups never clash.
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

  private async stopProcesses(processes: MachineProcess[]) {
    await Promise.all(processes.map((machine) => this.stop(machine)));
  }

  // Ask the machine to shut down so it can unregister from the supervisor.
  private async stop({ id, url }: MachineProcess) {
    const child = this.children.get(id);
    if (!child) return;

    const exited = once(child, 'exit');

    try {
      await askMachine(url, '/api/shutdown', { method: 'POST' });
    } catch {
      child.kill();
    }

    await Promise.race([exited, delay(STOP_TIMEOUT_MS)]);
    child.kill();
    await exited;
  }

  // Deselect a group when its last process exits, so another selection change
  // won't restart it.
  private removeProcess(id: string) {
    const { processes, selectedGroups } = this.state;
    const endedGroup = this.findProcess(id)?.groupFile;
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

  private findProcess(id: string) {
    return this.state.processes.find((machine) => machine.id === id);
  }

  private groupProcesses(groupFile: string) {
    return this.state.processes.filter(
      (machine) => machine.groupFile === groupFile,
    );
  }

  // Group files.

  // The new group is selected along with the others, so it starts.
  private async addGroup(name: string, duplicateOf: string | undefined) {
    const groupFile = createGroupFile(name, duplicateOf);
    const groups = readSavedGroups();
    const selectedGroups = [...this.state.selectedGroups, groupFile];

    this.update({ groups, selectedGroups });
    await this.matchSelectedGroups();
  }

  private async removeGroup(groupFile: string) {
    const { selectedGroups } = this.state;
    const stillSelected = selectedGroups.filter((group) => group !== groupFile);

    clearTimeout(this.saveTimers.get(groupFile));
    this.update({ selectedGroups: stillSelected });
    await this.stopProcesses(this.groupProcesses(groupFile));
    deleteGroupFile(groupFile);

    this.update({ groups: readSavedGroups() });
  }

  // Members. Each running machine knows its entry in its group file by its
  // place in the list.

  private async addMember(groupFile: string) {
    const members = this.currentMembers(groupFile);
    const added = { givenName: undefined, properties: nextInLine(members) };
    const running = this.groupProcesses(groupFile).length > 0;

    writeGroupMembers(groupFile, [...members, added]);
    if (running) {
      const memberIndex = members.length;
      await this.startMembers(groupFile, [{ ...added, memberIndex }]);
    }
  }

  // Looked up when its turn comes, since a deletion queued before it can move
  // its entry up a place.
  private async deleteMember(id: string) {
    const machine = this.findProcess(id);
    if (!machine) return;

    const { groupFile, memberIndex } = machine;
    const members = this.currentMembers(groupFile);
    const lastMember = members.length === 1;
    if (lastMember) {
      await this.removeGroup(groupFile);

      return;
    }

    await this.stop(machine);
    writeGroupMembers(groupFile, members.toSpliced(memberIndex, 1));
    this.moveUpMembersAfter(groupFile, memberIndex);
  }

  // The entries after a deleted one each move up a place.
  private moveUpMembersAfter(groupFile: string, memberIndex: number) {
    const processes = this.state.processes.map((machine) => {
      const after =
        machine.groupFile === groupFile && machine.memberIndex > memberIndex;
      const movedUp = { ...machine, memberIndex: machine.memberIndex - 1 };

      return after ? movedUp : machine;
    });

    this.update({ processes });
  }

  // Saving.

  // A machine changed, so its group file will be saved shortly.
  private saveSoon(groupFile: string) {
    const save = () => {
      this.saveTimers.delete(groupFile);
      void this.oneAtATime(() => this.saveGroup(groupFile));
    };

    clearTimeout(this.saveTimers.get(groupFile));
    this.saveTimers.set(groupFile, setTimeout(save, SAVE_DELAY_MS));
  }

  private saveGroup(groupFile: string) {
    writeGroupMembers(groupFile, this.currentMembers(groupFile));
  }

  // Use reported properties for running machines and saved properties for
  // machines whose processes have stopped.
  private currentMembers(groupFile: string): GroupMember[] {
    const running = this.groupProcesses(groupFile);

    return readMembers(groupFile).map((member, memberIndex) => {
      const machine = running.find((one) => one.memberIndex === memberIndex);

      return machine ? { ...member, properties: machine.properties } : member;
    });
  }

  // Environment.

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
    const post = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    };
    const requests = this.state.processes.map(({ url }) =>
      askMachine(url, '/api/environment', post),
    );

    await Promise.allSettled(requests);
  }
}

// Nothing running yet, in the first environment.
function initialState(): SimManagerState {
  const environment = environmentNames[0]!;

  return {
    supervisorUrl: CONFIG.SUPERVISOR_URL,
    groups: readSavedGroups(),
    selectedGroups: [],
    environments: environmentNames,
    environment,
    environmentValues: readEnvironment(environment),
    processes: [],
  };
}

// A copy of the rightmost machine, one spacing further right: the gap between
// the last two, or the width of a full swing when there's only one.
function nextInLine(members: GroupMember[]): MachineProperties {
  const leftToRight = members
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
