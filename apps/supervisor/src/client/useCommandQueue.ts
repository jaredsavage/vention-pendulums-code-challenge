import { useRef } from 'react';
import type { MachineCommand } from '@repo/protocol';

// Whoever sends shows what went wrong, so the queue only waits for each one.
export type SendMachineCommand = (
  machineId: string,
  command: MachineCommand,
) => Promise<unknown>;

interface Waiting {
  machineId: string;
  command: MachineCommand;
}

// Sends one command at a time, in the order they're given. A drag gives them
// faster than they can go, so a command still waiting its turn is replaced by
// a newer one of the same kind, for the same machine.
export function useCommandQueue(send: SendMachineCommand) {
  const waiting = useRef<Waiting[]>([]);
  const sending = useRef(false);

  function queue(machineId: string, command: MachineCommand) {
    const last = waiting.current.at(-1);
    const superseded =
      last?.machineId === machineId && last.command.type === command.type;
    if (superseded) {
      last.command = command;
    } else {
      waiting.current.push({ machineId, command });
    }

    if (!sending.current) {
      void sendWaiting();
    }
  }

  async function sendWaiting() {
    sending.current = true;

    let next = waiting.current.shift();
    while (next) {
      await send(next.machineId, next.command);
      next = waiting.current.shift();
    }

    sending.current = false;
  }

  return queue;
}
