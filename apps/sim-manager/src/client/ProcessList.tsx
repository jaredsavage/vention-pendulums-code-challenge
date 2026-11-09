import type { MachineProcess } from '../state.ts';
import { api } from './api.ts';

// A list for each group: a heading with a button to add a machine to it, then
// a line for each of its processes.
export function ProcessList({ processes }: { processes: MachineProcess[] }) {
  const groups = Map.groupBy(processes, ({ groupFile }) => groupFile);
  const processGroups = [...groups].map(([groupFile, members]) => (
    <ProcessGroup key={groupFile} groupFile={groupFile} members={members} />
  ));

  return (
    <section>
      <h2>Processes</h2>
      {processGroups}
    </section>
  );
}

interface ProcessGroupProps {
  groupFile: string;
  members: MachineProcess[];
}

// A group always has at least one member, or it wouldn't be listed.
function ProcessGroup({ groupFile, members }: ProcessGroupProps) {
  const { groupId } = members[0]!;
  const heading = `${groupId} (${members.length})`;
  const processLines = members.map((member) => (
    <ProcessLine key={member.id} machineProcess={member} />
  ));

  return (
    <ul>
      <li>
        <h3>{heading}</h3>
        <button
          type="button"
          title="Add a copy of the last machine"
          onClick={() => api.addMachine(groupFile)}
        >
          New Machine
        </button>
      </li>
      {processLines}
    </ul>
  );
}

// Sim Manager hands out the numbers. The address opens the machine's page, and
// End stops it.
function ProcessLine({ machineProcess }: { machineProcess: MachineProcess }) {
  const { id, number, url, program, pid } = machineProcess;
  const programDetails = `${program}, PID ${pid ?? 'none'}`;
  const host = new URL(url).host;

  return (
    <li>
      <b title={programDetails}>{number}</b>
      <a href={url} target="_blank" rel="noreferrer">
        {host}
      </a>
      <button
        type="button"
        title="End this machine's process"
        onClick={() => api.endProcess(id)}
      >
        End
      </button>
    </li>
  );
}
