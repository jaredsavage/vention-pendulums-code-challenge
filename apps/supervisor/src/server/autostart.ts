import { randomUUID } from 'node:crypto';
import {
  IDLE_RUN_ID,
  type Command,
  type ObservedMachine,
} from '@repo/protocol';
import { dispatchExclusively } from './commands.ts';
import {
  groupSnapshot,
  type GroupRegistry,
  type MachineGroup,
} from './groups.ts';

// How long a new group's membership stays the same before it counts as
// gathered, and how often groups are checked.
const QUIET_PERIOD_MS = 2000;
const CHECK_INTERVAL_MS = 250;

// Starts each new group once it has gathered: no machine has joined or left
// for a quiet period, and every machine is online and has never run.
export function autostartGroups(registry: GroupRegistry) {
  function startGatheredGroups() {
    const gathered = registry.all().filter(hasGathered);

    for (const group of gathered) {
      void start(group, registry);
    }
  }

  const timer = setInterval(startGatheredGroups, CHECK_INTERVAL_MS);

  return () => clearInterval(timer);
}

function hasGathered(group: MachineGroup) {
  const unchangedFor = Date.now() - group.changedAt;
  const quiet = unchangedFor >= QUIET_PERIOD_MS;
  const { machines } = groupSnapshot(group);
  const allFresh = machines.length > 0 && machines.every(isFresh);

  return !group.autostarted && !group.busy && quiet && allFresh;
}

// Online, stopped, and never run.
function isFresh({ online, state }: ObservedMachine) {
  return online && state?.status === 'stopped' && state.runId === IDLE_RUN_ID;
}

async function start(group: MachineGroup, registry: GroupRegistry) {
  const runId = randomUUID();
  const command: Command = { type: 'START', runId, resume: false };

  group.autostarted = true;
  await dispatchExclusively(group, command, registry);
}
