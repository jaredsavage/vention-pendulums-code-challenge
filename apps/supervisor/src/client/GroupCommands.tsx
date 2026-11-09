import type { ReactNode } from 'react';
import type { Command, ObservedMachine } from '@repo/protocol';

const countdownFormat = new Intl.DurationFormat('en', { style: 'narrow' });

const EDIT_HINT = 'Stop, reset and edit the group';
const START_HINT = 'Start the group from where each pendulum starts';
const RESUME_HINT = 'Resume the group from where it paused';
const PAUSE_HINT = 'Pause every pendulum where it is';
const STOP_HINT = 'Stop every pendulum where it is';
const COLLISION_HINT =
  'Stop the group when two pendulums collide, then restart it';

interface Props {
  machines: ObservedMachine[];
  send: (command: Command) => void;
  canEdit: boolean;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  children?: ReactNode;
}

// The commands for the whole group, and a word on how its machines are doing.
export function GroupCommands({
  machines,
  send,
  canEdit,
  editing,
  onEditingChange,
  children,
}: Props) {
  const can = availableCommands(machines);
  const noMachines = machines.length === 0;
  const stopOnCollision =
    !noMachines && machines.every(({ state }) => state?.stopOnCollision);
  const countdown = restartCountdown(machines);
  const split = splitStatus(machines);

  // Editing starts from where each pendulum starts, so the group goes back
  // there first.
  function toggleEditing() {
    if (!editing) {
      send({ type: 'RESET' });
    }

    onEditingChange(!editing);
  }

  function start() {
    const runId = crypto.randomUUID();
    send({ type: 'START', runId, resume: can.resume });
  }

  function pause() {
    send({ type: 'PAUSE' });
  }

  function stop() {
    send({ type: 'STOP' });
  }

  function setCollisionStopping(enabled: boolean) {
    send({ type: 'SET_COLLISION_STOPPING', enabled });
  }

  const editCheckbox = canEdit && (
    <label title={EDIT_HINT}>
      <input type="checkbox" checked={editing} onChange={toggleEditing} />
      Edit mode
    </label>
  );
  const startLabel = can.resume ? 'Resume' : 'Start';
  const startHint = can.resume ? RESUME_HINT : START_HINT;
  const startButton = (
    <button
      type="button"
      title={startHint}
      disabled={!can.start && !can.resume}
      onClick={start}
    >
      {startLabel}
    </button>
  );
  const pauseButton = (
    <button
      type="button"
      title={PAUSE_HINT}
      disabled={!can.pause}
      onClick={pause}
    >
      Pause
    </button>
  );
  const stopButton = (
    <button type="button" title={STOP_HINT} disabled={!can.stop} onClick={stop}>
      Stop
    </button>
  );
  const collisionCheckbox = (
    <label title={COLLISION_HINT}>
      <input
        type="checkbox"
        checked={stopOnCollision}
        disabled={noMachines}
        onChange={(event) => setCollisionStopping(event.target.checked)}
      />
      Stop on collision
    </label>
  );
  const countdownText = countdown && (
    <small role="status">
      <b>{countdown}</b> until restart
    </small>
  );
  const splitText = split && <small role="status">{split}</small>;

  // While editing, only Edit mode shows. The rest is for running the group.
  const runSettings = !editing && (
    <>
      {collisionCheckbox}
      {countdownText}
      {splitText}
    </>
  );
  const runButtons = !editing && (
    <>
      {startButton}
      {pauseButton}
      {stopButton}
    </>
  );

  // The buttons top left, with how the group runs under them. Edit mode has
  // the top right corner to itself.
  return (
    <div role="toolbar" aria-label="Group commands" data-blueprint={editing}>
      <div>
        <div>
          {runButtons}
          {children}
        </div>
        {runSettings}
      </div>
      {editCheckbox}
    </div>
  );
}

// What the group can be asked to do, going by its machines' statuses. A group
// that paused unevenly can still resume: running machines join in, and stopped
// ones, like a machine that's just been added, join from their starting angle.
function availableCommands(machines: ObservedMachine[]) {
  const statuses = machines.map(({ state }) => state?.status);
  const hasMachines = machines.length > 0;

  const allStopped = statuses.every((status) => status === 'stopped');
  const somePaused = statuses.includes('paused');
  const someMoving = statuses.some(
    (status) => status !== 'paused' && status !== 'stopped',
  );
  const canJoinResume = statuses.every(
    (status) =>
      status === 'paused' || status === 'running' || status === 'stopped',
  );

  return {
    start: hasMachines && allStopped,
    resume: somePaused && canJoinResume,
    pause: someMoving,
    stop: !allStopped,
  };
}

// After a collision, the soonest restart any machine has scheduled, in whole
// seconds like 5s, rounded up so it counts down to 1s.
function restartCountdown(machines: ObservedMachine[]) {
  const restartTimes = machines.flatMap(({ state }) => state?.restartAt ?? []);
  if (restartTimes.length === 0) return null;

  const soonest = Math.min(...restartTimes);
  const seconds = Math.ceil((soonest - Date.now()) / 1000);

  return countdownFormat.format({ seconds });
}

// Some machines can pause or stop on their own, like when a neighbour goes
// quiet, while the rest carry on. Says how many are in each state, and why the
// first one halted.
function splitStatus(machines: ObservedMachine[]) {
  const states = machines.flatMap(({ state }) => (state ? [state] : []));
  const byStatus = Map.groupBy(states, ({ status }) => status);
  const halted = states.find(
    ({ status }) => status === 'paused' || status === 'stopped',
  );

  const statusesDiffer = byStatus.size > 1;
  const oneHalted = halted !== undefined;
  if (!statusesDiffer || !oneHalted) return null;

  const counts = [...byStatus].map(
    ([status, { length }]) => `${length} ${status}`,
  );

  return `${counts.join(', ')}: ${halted.reason}`;
}
