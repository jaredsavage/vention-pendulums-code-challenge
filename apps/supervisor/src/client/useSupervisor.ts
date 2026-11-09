import { useEffect, useState } from 'react';
import {
  supervisorStateSchema,
  type Command,
  type MachineCommand,
  type Result,
  type SupervisorState,
} from '@repo/protocol';
import { api } from './api.ts';

const NOTHING_YET: SupervisorState = { groups: [] };

// The supervisor's live state, how often it arrives, and its commands.
export function useSupervisor() {
  const [state, setState] = useState(NOTHING_YET);
  const [connected, setConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateHz, setUpdateHz] = useState(0);

  useEffect(() => {
    // EventSource reconnects by itself after an error.
    const stream = api.openStateStream();
    let updatesThisSecond = 0;

    function receive(event: MessageEvent<string>) {
      const parsed = supervisorStateSchema.safeParse(JSON.parse(event.data));
      if (!parsed.success) return;

      setState(parsed.data);
      updatesThisSecond += 1;
    }

    function reportUpdateRate() {
      setUpdateHz(updatesThisSecond);
      updatesThisSecond = 0;
    }

    stream.onopen = () => setConnected(true);
    stream.onerror = () => setConnected(false);
    stream.onmessage = receive;
    const rateTimer = setInterval(reportUpdateRate, 1000);

    return () => {
      clearInterval(rateTimer);
      stream.close();
    };
  }, []);

  // A refused command shows its error until the next one succeeds.
  async function showOutcome(request: Promise<Result>) {
    const result = await request;

    setError(result.ok ? null : (result.error ?? 'Command failed.'));

    return result;
  }

  function send(groupId: string, command: Command) {
    void showOutcome(api.sendCommand(groupId, command));
  }

  function configure(
    groupId: string,
    machineId: string,
    command: MachineCommand,
  ) {
    return showOutcome(api.configureMachine(groupId, machineId, command));
  }

  return { ...state, updateHz, connected, error, send, configure };
}
