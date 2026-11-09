import { createHash } from 'node:crypto';
import {
  IDLE_RUN_ID,
  type Command,
  type GroupMembers,
  type HoldCommand,
  type MachineCommand,
  type MachineIdentity,
  type MachinePropertiesPatch,
  type MachineState,
  type PeerMessage,
  type PeerPayload,
  type PositionUpdate,
  type Result,
  type StartCommand,
  type Status,
} from '@repo/protocol';
import { CONFIG } from '../../config.ts';
import { couldCollide, surfaceGap, type Bob } from './collision.ts';
import type { MachineDefinition } from './definition.ts';
import { PeerReports } from './peerReports.ts';
import { Pendulum, sizeProblem } from './pendulum.ts';
import { Recovery } from './recovery.ts';

const COLLISION_THRESHOLD = CONFIG.MACHINE.COLLISION_THRESHOLD;

type Broadcast = (message: PeerPayload, recipients?: string[]) => void;

// Where a run stands, apart from recovering from a collision.
type RunStatus = Extract<Status, 'running' | 'paused' | 'stopped'>;

interface ConnectionMeasurement {
  updateHz: number;
  distance: number | null;
}

// One machine's part in its group: its run, what it's heard from its peers,
// and stopping and restarting together after a collision. The device does
// the moving.
export class Machine {
  readonly identity: MachineIdentity;
  readonly device: Pendulum;
  readonly broadcast: Broadcast;
  group: GroupMembers;

  // Measured once a second for the machine's own page: how often each
  // connected peer's positions arrive, and how far away it is.
  connections: Record<string, ConnectionMeasurement> = {};

  private runId = IDLE_RUN_ID;
  private runStatus: RunStatus = 'stopped';
  private reason = 'Ready';
  private recovery: Recovery | null = null;
  private stopOnCollision: boolean;

  private connectedPeers: string[] = [];
  private readonly peers = new PeerReports();
  private messagesPerSecond = 0;
  private measuredAt = Date.now();

  constructor(definition: MachineDefinition, broadcast: Broadcast) {
    const { groupId, machine, stopOnCollision, environment } = definition;
    const { id, name, url, properties } = machine;

    this.identity = { id, name, url };
    this.group = { id: groupId, machines: [this.identity] };
    this.device = new Pendulum(properties, environment);
    this.broadcast = broadcast;
    this.stopOnCollision = stopOnCollision;
  }

  get state(): MachineState {
    return {
      ...this.device.measurement,
      runId: this.runId,
      status: this.status,
      reason: this.reason,
      properties: this.device.properties,
      environment: this.device.environment,
      connectedPeers: this.connectedPeers,
      neighbours: this.neighbours,
      messagesPerSecond: this.messagesPerSecond,
      stopOnCollision: this.stopOnCollision,
      collision: this.recovery?.collision ?? null,
      restartAt: this.recovery?.restartAt ?? null,
    };
  }

  get status(): Status {
    if (!this.recovery) return this.runStatus;

    const countingDown = this.recovery.restartAt !== null;

    return countingDown ? 'restart-countdown' : 'waiting-for-peers';
  }

  // Peers close enough that they could collide with this machine. A peer is
  // only one once it has reported its size.
  get neighbours() {
    return this.peerIds.filter((id) => this.couldCollideWith(id));
  }

  updateMembership(group: GroupMembers) {
    const previousIds = new Set(this.memberIds);
    const nextIds = new Set(group.machines.map(({ id }) => id));
    const membershipChanged = previousIds.symmetricDifference(nextIds).size > 0;

    this.group = group;
    if (membershipChanged) {
      this.pause('Group changed');
    }
  }

  peersChanged(connectedPeers: string[]) {
    this.connectedPeers = connectedPeers;
    if (this.isActive && !this.allPeersConnected) {
      this.pause('A peer disconnected');
    }
  }

  peerLost(id: string) {
    this.peers.forget(id);
  }

  // A newly connected peer hears this machine's properties first.
  introduceTo(peerId: string) {
    const { properties } = this.device;

    this.broadcast({ type: 'PROPERTIES', properties }, [peerId]);
  }

  command(command: Command): Result {
    switch (command.type) {
      case 'START':
        return this.startWithGroup(command);
      case 'PAUSE':
        this.pause('By user');
        break;
      case 'STOP':
        this.stop('By user');
        break;
      case 'RESET':
        this.stop('Reset by user');
        this.device.reset();
        break;
      case 'SET_COLLISION_STOPPING':
        this.stopOnCollision = command.enabled;
        break;
    }

    return { ok: true };
  }

  // Changes the supervisor asks of this machine alone. Being held only stills
  // the device, so the machine stays in its run.
  configure(command: MachineCommand): Result {
    const problem = 'changes' in command ? sizeProblem(command.changes) : null;
    if (problem) return refuse(problem);

    switch (command.type) {
      case 'SET_PROPERTIES':
        this.setProperties(command.changes);
        break;
      case 'HOLD':
        this.hold(command);
        break;
      case 'RELEASE':
        this.device.release();
        break;
    }

    return { ok: true };
  }

  pause(reason: string) {
    if (this.isActive) {
      this.halt('paused', reason);
    }
  }

  stop(reason: string) {
    this.halt('stopped', reason);
  }

  receive(message: PeerMessage) {
    if (message.type === 'PROPERTIES') {
      this.peers.heardProperties(message.senderId, message.properties);

      return;
    }

    this.catchUpIfPeerRestartedFirst(message.runId);
    if (message.runId !== this.runId) return;

    switch (message.type) {
      case 'POSITION_UPDATE':
        this.receivePosition(message);
        break;
      case 'STOP':
        this.beginRecovery(message.details, message.collision);
        break;
      case 'RESTART_READY':
        this.recovery?.markReady(message.senderId);
        this.scheduleRestartOnceAllReady();
        break;
    }
  }

  // The machine's heartbeat, once per tick.
  sync() {
    const now = Date.now();

    this.pauseIfNeighboursAreQuiet(now);
    this.measureEverySecond(now);
    this.restartIfDue(now);
    this.broadcastPosition();
    this.checkCollisions();
  }

  // A machine still running when the rest of its group resumes joins their
  // run, so a group that paused unevenly comes back together.
  private startWithGroup({ runId, resume }: StartCommand): Result {
    const stopped = this.status === 'stopped';
    const resumable = this.status === 'paused' || this.status === 'running';
    if (resume && !resumable) return refuse('Cannot resume this run.');
    if (!resume && !stopped) return refuse('Stop before starting a new run.');
    if (!this.allPeersReady) return refuse('Required peers are not ready.');

    const reason = resume ? 'Resumed with the group' : 'Started with the group';
    this.run(runId, resume, reason);

    return { ok: true };
  }

  // Holding only moves the device. Where it starts changes only when that's
  // one of the changes asked for.
  private hold({ changes, angle }: HoldCommand) {
    this.device.hold(angle);
    this.setProperties(changes);
  }

  // Peers hear the change straight away, mid-run or not. A stopped machine
  // that isn't being held goes back to where it now starts.
  private setProperties(changes: MachinePropertiesPatch) {
    this.device.setProperties({ ...this.device.properties, ...changes });

    const resting = this.status === 'stopped' && !this.device.held;
    if (resting) {
      this.device.reset();
    }

    const { properties } = this.device;

    this.broadcast({ type: 'PROPERTIES', properties });
  }

  private receivePosition(update: PositionUpdate) {
    const fromNeighbour = this.neighbours.includes(update.senderId);
    if (fromNeighbour) {
      this.peers.heardPosition(update, Date.now());
    }
  }

  private run(runId: string, resume: boolean, reason: string) {
    if (runId !== this.runId) {
      this.runId = runId;
      this.peers.forgetPositions();
    }

    if (!resume) {
      this.device.reset();
    }

    this.recovery = null;
    this.runStatus = 'running';
    this.reason = reason;
    this.device.run();
  }

  private halt(runStatus: 'paused' | 'stopped', reason: string) {
    this.device.pause();
    this.recovery = null;
    this.runStatus = runStatus;
    this.reason = reason;
  }

  // Only a running machine's neighbours owe it reports.
  private pauseIfNeighboursAreQuiet(now: number) {
    const watched = this.status === 'running' ? this.neighbours : [];

    this.peers.restartClocksExcept(watched, now);
    if (this.peers.anyQuiet(watched, now)) {
      this.pause('A neighbour went quiet');
    }
  }

  // Counted over a second at a time, so the numbers hold still long enough to
  // read. The distance is only known while the peer is reporting.
  private measureEverySecond(now: number) {
    const elapsedSeconds = (now - this.measuredAt) / 1000;
    if (elapsedSeconds < 1) return;

    const counts = this.peers.takePositionCounts();
    const totalCount = counts.values().reduce((sum, count) => sum + count, 0);
    const connections: Record<string, ConnectionMeasurement> = {};

    for (const id of this.connectedPeers) {
      const updateHz = (counts.get(id) ?? 0) / elapsedSeconds;
      const distance = updateHz > 0 ? this.gapTo(id) : null;

      connections[id] = { updateHz, distance };
    }

    this.connections = connections;
    this.messagesPerSecond = totalCount / elapsedSeconds;
    this.measuredAt = now;
  }

  private restartIfDue(now: number) {
    const due = this.recovery?.isDue(now) ?? false;
    if (due) {
      this.restart();
    }
  }

  private broadcastPosition() {
    const { runId } = this;
    const { angle, position } = this.device.measurement;

    this.broadcast(
      { type: 'POSITION_UPDATE', runId, angle, position },
      this.neighbours,
    );
  }

  // Checked on the machine's own clock rather than as positions arrive, so a
  // dropped message never skips a check. It compares the latest reports, so a
  // contact shorter than the time between them can fall through.
  private checkCollisions() {
    const hitId = this.neighbours.find((id) => this.isTouching(id));
    if (!hitId) return;

    const details = `${this.identity.name} hit ${this.nameOf(hitId)}`;
    this.beginRecovery(details, [this.identity.id, hitId]);
  }

  // The first machine to see a collision stops the group, and tells everyone
  // it's ready to restart.
  private beginRecovery(details: string, collision: string[]) {
    const canBeginRecovery = this.stopOnCollision && this.status === 'running';
    if (!canBeginRecovery) return;

    const { runId } = this;

    this.device.pause();
    this.recovery = new Recovery(collision, this.identity.id);
    this.reason = details;
    this.broadcast({ type: 'STOP', runId, details, collision });
    this.broadcast({ type: 'RESTART_READY', runId });
    this.scheduleRestartOnceAllReady();
  }

  private scheduleRestartOnceAllReady() {
    this.recovery?.scheduleOnceAllReady(this.memberIds, Date.now());
  }

  // A peer whose countdown ended first is already in the next run. This
  // machine joins it now, so it hears that run's messages, including another
  // collision's STOP.
  private catchUpIfPeerRestartedFirst(runId: string) {
    const peerRestartedFirst =
      this.recovery !== null && runId === nextRunId(this.runId);
    if (peerRestartedFirst) {
      this.restart();
    }
  }

  private restart() {
    this.run(nextRunId(this.runId), false, 'Restarted after a collision');
  }

  private get isActive() {
    return this.status !== 'stopped' && this.status !== 'paused';
  }

  private get memberIds() {
    return this.group.machines.map(({ id }) => id);
  }

  private get peerIds() {
    return this.memberIds.filter((id) => id !== this.identity.id);
  }

  private get allPeersConnected() {
    return this.peerIds.every((id) => this.connectedPeers.includes(id));
  }

  // A peer that hasn't reported its size might be within reach, so it has to
  // report first.
  private get allPeersReady() {
    const allReported = this.peerIds.every((id) => this.peers.properties(id));

    return this.allPeersConnected && allReported;
  }

  private get bob(): Bob {
    const { position } = this.device.measurement;
    const { radius } = this.device.properties;

    return { position, radius };
  }

  private couldCollideWith(id: string) {
    const peer = this.peers.properties(id);
    if (!peer) return false;

    const own = this.device.properties;

    return couldCollide(own, peer, COLLISION_THRESHOLD);
  }

  private isTouching(id: string) {
    const gap = this.gapTo(id);

    return gap !== null && gap <= COLLISION_THRESHOLD;
  }

  private gapTo(id: string) {
    const peerBob = this.peers.bob(id);

    return peerBob ? surfaceGap(this.bob, peerBob) : null;
  }

  private nameOf(id: string) {
    const member = this.group.machines.find((machine) => machine.id === id);

    return member?.name ?? id;
  }
}

function refuse(error: string): Result {
  return { ok: false, error };
}

// Every machine works out the same next run, without having to agree on it.
export function nextRunId(runId: string) {
  return createHash('sha256').update(runId).digest('hex').slice(0, 32);
}
