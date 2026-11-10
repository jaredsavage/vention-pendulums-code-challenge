import { createHash } from 'node:crypto';
import type {
  Command,
  Environment,
  GroupMembers,
  HoldCommand,
  MachineCommand,
  MachineProperties,
  MachinePropertiesPatch,
  MachineState,
  PeerMessage,
  PeerPayload,
  Result,
  StartCommand,
  Status,
} from '@repo/protocol';
import { CONFIG } from '../config.ts';
import { log } from './log.ts';
import {
  advanceMotion,
  bobPosition,
  couldCollide,
  gusting,
  initialMotion,
  surfaceGap,
} from './physics.ts';
import { newPeer, type State } from './state.ts';

const THRESHOLD = CONFIG.MACHINE.COLLISION_THRESHOLD;
const QUIET_TIMEOUT_MS = 1500;
const RESTART_DELAY_MS = 5000;
const SIZES = ['length', 'radius', 'mass'] as const;

type Send = (message: PeerPayload, recipients?: string[]) => void;

// Whatever keeps this machine's settings. Nothing waits on its answer.
export interface SettingsStore {
  url: string;
  save: (properties: MachineProperties) => void;
  remove: () => void;
}

// One machine: what the supervisor, its peers and each tick do to its state.
export class Machine {
  readonly #state: State;
  // Given by the sockets once they're connected.
  send: Send = () => {};
  // Given at startup, when something keeps its settings.
  settings: SettingsStore | null = null;

  constructor(state: State) {
    this.#state = state;
  }

  // Everyone can read what the machine knows; only the machine changes it.
  get state(): Readonly<State> {
    return this.#state;
  }

  // What it tells the supervisor.
  get report(): MachineState {
    const state = this.#state;

    return {
      angle: state.motion.angle,
      position: this.bob,
      runId: state.runId,
      status: state.status,
      reason: state.reason,
      properties: state.properties,
      environment: state.environment,
      connectedPeers: this.peerIds.filter((id) => this.peer(id)?.connected),
      neighbours: this.neighbours,
      messagesPerSecond: state.messagesPerSecond,
      stopOnCollision: state.stopOnCollision,
      collision: state.collision,
      restartAt: state.restartAt,
    };
  }

  // Peers close enough to collide with. A peer is only one once it has
  // reported its size.
  get neighbours() {
    const { properties } = this.#state;

    return this.peerIds.filter((id) => {
      const peerProperties = this.peer(id)?.properties;

      return peerProperties
        ? couldCollide(properties, peerProperties, THRESHOLD)
        : false;
    });
  }

  // From the supervisor.

  updateMembership(group: GroupMembers) {
    const previousIds = new Set(this.memberIds);
    const nextIds = new Set(group.machines.map(({ id }) => id));
    const changed = previousIds.symmetricDifference(nextIds).size > 0;

    this.#state.group = group;
    if (changed) {
      this.pause('Group changed');
    }
  }

  command(command: Command): Result {
    switch (command.type) {
      case 'START':
        return this.start(command);
      case 'PAUSE':
        this.pause('By user');
        break;
      case 'STOP':
        this.stop('By user');
        break;
      case 'RESET':
        this.stop('Reset by user');
        this.#state.motion = initialMotion(this.#state.properties);
        break;
      case 'SET_COLLISION_STOPPING':
        this.#state.stopOnCollision = command.enabled;
        break;
    }

    return { ok: true };
  }

  // Being held only stills the pendulum, so the machine stays in its run.
  configure(command: MachineCommand): Result {
    const problem = 'changes' in command ? sizeProblem(command.changes) : null;
    if (problem) return { ok: false, error: problem };

    switch (command.type) {
      case 'SET_PROPERTIES':
        this.setProperties(command.changes);
        break;
      case 'HOLD':
        this.hold(command);
        break;
      case 'RELEASE':
        this.#state.held = false;
        break;
      case 'DESTROY':
        return this.destroy();
    }

    return { ok: true };
  }

  // From Sim Manager.

  changeEnvironment(changes: Partial<Environment>) {
    this.#state.environment = { ...this.#state.environment, ...changes };
  }

  // From peers.

  // A peer hears this machine's properties as soon as it can.
  peerConnected(id: string) {
    const { properties } = this.#state;

    this.knownPeer(id).connected = true;
    this.send({ type: 'PROPERTIES', properties }, [id]);
  }

  // Pause if a peer disconnects. Keep its properties until it reconnects and
  // sends them again.
  peerDisconnected(id: string) {
    const peer = this.knownPeer(id);

    peer.connected = false;
    peer.position = null;

    const allConnected = this.peerIds.every(
      (peerId) => this.peer(peerId)?.connected,
    );
    if (!allConnected) {
      this.pause('A peer disconnected');
    }
  }

  receive(message: PeerMessage) {
    const peer = this.knownPeer(message.senderId);

    if (message.type === 'PROPERTIES') {
      peer.properties = message.properties;

      return;
    }

    // A peer whose countdown ended first is already in the next run. Joining
    // it now means hearing that run's messages, like another collision's STOP.
    const peerRestartedFirst =
      this.isRecovering && message.runId === nextRunId(this.#state.runId);
    if (peerRestartedFirst) {
      this.restart();
    }

    if (message.runId !== this.#state.runId) return;

    switch (message.type) {
      case 'POSITION_UPDATE':
        if (this.neighbours.includes(message.senderId)) {
          peer.position = message.position;
          peer.positionCount += 1;
          peer.lastHeard = Date.now();
        }
        break;
      case 'STOP':
        this.beginRecovery(message.details, message.collision);
        break;
      case 'RESTART_READY':
        this.#state.ready.add(message.senderId);
        this.scheduleRestart();
        break;
    }
  }

  // Every tick.

  tick() {
    const now = Date.now();

    this.pauseIfNeighboursAreQuiet(now);
    this.measureEverySecond(now);
    this.restartIfDue(now);
    this.sendPosition();
    this.checkCollisions();
  }

  // Moves the pendulum on by one step, while it's running and nobody's holding
  // it.
  swing(seconds: number) {
    const state = this.#state;
    const moving = state.status === 'running' && !state.held;
    if (!moving) return;

    const environment = gusting(state.environment, Date.now() / 1000);
    const { motion, properties } = state;

    state.motion = advanceMotion(motion, properties, environment, seconds);
  }

  pause(reason: string) {
    const active = this.#state.status === 'running' || this.isRecovering;
    if (active) {
      this.setRunStatus('paused', reason);
    }
  }

  stop(reason: string) {
    this.setRunStatus('stopped', reason);
  }

  // The space between the two bobs, while the peer reports where it is.
  gapTo(id: string) {
    const peer = this.peer(id);
    if (!peer?.position || !peer.properties) return null;

    const { radius } = this.#state.properties;

    return surfaceGap(this.bob, radius, peer.position, peer.properties.radius);
  }

  // A running machine joins its group's resume, so a group that paused
  // unevenly comes back together. A stopped one, like a machine that's just
  // been added, has nothing to carry on from, so it starts afresh.
  private start({ runId, resume }: StartCommand): Result {
    const { status } = this.#state;
    const stopped = status === 'stopped';
    const canJoin = stopped || status === 'paused' || status === 'running';
    const allPeersReady = this.peerIds.every((id) => {
      const peer = this.peer(id);

      return peer?.connected && peer.properties;
    });

    if (resume && !canJoin) return refuse('Cannot resume this run.');
    if (!resume && !stopped) return refuse('Stop before starting a new run.');
    if (!allPeersReady) return refuse('Required peers are not ready.');

    const carriesOn = resume && !stopped;
    const reason = carriesOn
      ? 'Resumed with the group'
      : 'Started with the group';
    this.run(runId, carriesOn, reason);

    return { ok: true };
  }

  // Where it starts changes only when that's one of the changes asked for.
  private hold({ changes, angle }: HoldCommand) {
    const heldAngle = angle ?? this.#state.motion.angle;

    this.#state.held = true;
    this.#state.motion = { angle: heldAngle, angularVelocity: 0 };
    this.setProperties(changes);
  }

  // New properties apply from where it is, so moving the anchor carries the
  // swing with it. A stopped machine that isn't held goes to its new start.
  private setProperties(changes: MachinePropertiesPatch) {
    const state = this.#state;

    state.properties = { ...state.properties, ...changes };
    if (state.status === 'stopped' && !state.held) {
      state.motion = initialMotion(state.properties);
    }

    const { properties } = state;
    const changed = Object.keys(changes).length > 0;

    this.send({ type: 'PROPERTIES', properties });
    if (changed) {
      this.settings?.save(properties);
    }
  }

  // The settings service handles deletion, including shutting down the machine.
  private destroy(): Result {
    if (!this.settings) return refuse('Nothing here can remove this machine.');

    this.settings.remove();

    return { ok: true };
  }

  // Positions belong to a run, so a new run starts without them.
  private run(runId: string, carryOn: boolean, reason: string) {
    const state = this.#state;

    if (runId !== state.runId) {
      state.runId = runId;
      for (const peer of state.peers.values()) {
        peer.position = null;
      }
    }

    if (!carryOn) {
      state.motion = initialMotion(state.properties);
    }

    this.setRunStatus('running', reason);
  }

  // A plain run status, so any recovery is over.
  private setRunStatus(status: Status, reason: string) {
    this.setStatus(status, reason);
    this.#state.collision = null;
    this.#state.restartAt = null;
  }

  private setStatus(status: Status, reason: string) {
    this.#state.status = status;
    this.#state.reason = reason;
    log(`${status}: ${reason}`);
  }

  // Only neighbours of a running machine are expected to send position reports.
  // Reset other timers so newly watched neighbours have time to report.
  private pauseIfNeighboursAreQuiet(now: number) {
    const watched = this.#state.status === 'running' ? this.neighbours : [];
    let quiet = false;

    for (const [id, peer] of this.#state.peers) {
      if (!watched.includes(id)) {
        peer.lastHeard = now;
      }

      quiet ||= now - peer.lastHeard > QUIET_TIMEOUT_MS;
    }

    if (quiet) {
      this.pause('A neighbour went quiet');
    }
  }

  // Counted a second at a time, so the numbers on the machine's own page hold
  // still long enough to read.
  private measureEverySecond(now: number) {
    const elapsedSeconds = (now - this.#state.measuredAt) / 1000;
    if (elapsedSeconds < 1) return;

    let totalCount = 0;
    for (const peer of this.#state.peers.values()) {
      peer.updateHz = peer.positionCount / elapsedSeconds;
      totalCount += peer.positionCount;
      peer.positionCount = 0;
    }

    this.#state.messagesPerSecond = totalCount / elapsedSeconds;
    this.#state.measuredAt = now;
  }

  private restartIfDue(now: number) {
    const { restartAt } = this.#state;
    if (restartAt !== null && now >= restartAt) {
      this.restart();
    }
  }

  private sendPosition() {
    const { runId, motion } = this.#state;
    const { angle } = motion;
    const position = this.bob;

    this.send(
      { type: 'POSITION_UPDATE', runId, angle, position },
      this.neighbours,
    );
  }

  // Checked on the machine's own clock rather than as positions arrive, so a
  // dropped message never skips a check. A contact shorter than the time
  // between reports can fall through.
  private checkCollisions() {
    const isTouching = (id: string) => {
      const gap = this.gapTo(id);

      return gap !== null && gap <= THRESHOLD;
    };
    const hitId = this.neighbours.find(isTouching);
    if (!hitId) return;

    const { identity, group } = this.#state;
    const hit = group.machines.find(({ id }) => id === hitId);
    const details = `${identity.name} hit ${hit?.name ?? hitId}`;

    this.beginRecovery(details, [identity.id, hitId]);
  }

  // The first machine to see a collision stops the group, and tells everyone
  // it's ready to restart.
  private beginRecovery(details: string, collision: string[]) {
    const state = this.#state;
    const canRecover = state.stopOnCollision && state.status === 'running';
    if (!canRecover) return;

    const { runId } = state;

    this.setStatus('waiting-for-peers', details);
    state.collision = collision;
    state.ready = new Set([state.identity.id]);

    this.send({ type: 'STOP', runId, details, collision });
    this.send({ type: 'RESTART_READY', runId });
    this.scheduleRestart();
  }

  // Each machine starts its own countdown once every group member is ready.
  private scheduleRestart() {
    const state = this.#state;
    const waiting = state.status === 'waiting-for-peers';
    const allReady = this.memberIds.every((id) => state.ready.has(id));
    if (!waiting || !allReady) return;

    this.setStatus('restart-countdown', state.reason);
    state.restartAt = Date.now() + RESTART_DELAY_MS;
  }

  private restart() {
    const runId = nextRunId(this.#state.runId);

    this.run(runId, false, 'Restarted after a collision');
  }

  private get isRecovering() {
    const { status } = this.#state;

    return status === 'waiting-for-peers' || status === 'restart-countdown';
  }

  private get memberIds() {
    return this.#state.group.machines.map(({ id }) => id);
  }

  private get peerIds() {
    return this.memberIds.filter((id) => id !== this.#state.identity.id);
  }

  private get bob() {
    return bobPosition(this.#state.motion, this.#state.properties);
  }

  private peer(id: string) {
    return this.#state.peers.get(id);
  }

  // A peer can be heard before this machine's own connection to it is up.
  private knownPeer(id: string) {
    const known = this.peer(id);
    if (known) return known;

    const peer = newPeer();
    this.#state.peers.set(id, peer);

    return peer;
  }
}

// What's wrong with a change, if anything, for the machine to refuse it.
function sizeProblem(changes: MachinePropertiesPatch) {
  const impossible = SIZES.find((size) => {
    const value = changes[size];

    return value !== undefined && value <= 0;
  });

  if (!impossible) return null;

  return `A pendulum's ${impossible} must be more than zero.`;
}

function refuse(error: string): Result {
  return { ok: false, error };
}

// Every machine works out the same next run, without having to agree on it.
export function nextRunId(runId: string) {
  return createHash('sha256').update(runId).digest('hex').slice(0, 32);
}
