import type { MachineProcess } from '../state.ts';

// A heading for each group, then a line for each of its processes.
export function ProcessList({ processes }: { processes: MachineProcess[] }) {
  const groups = Map.groupBy(processes, ({ groupId }) => groupId);
  const processGroups = [...groups].map(([groupId, members]) => (
    <ProcessGroup key={groupId} groupId={groupId} members={members} />
  ));

  return (
    <section>
      <h2>Processes</h2>
      <ul>{processGroups}</ul>
    </section>
  );
}

interface ProcessGroupProps {
  groupId: string;
  members: MachineProcess[];
}

function ProcessGroup({ groupId, members }: ProcessGroupProps) {
  const heading = `${groupId} (${members.length})`;
  const processLines = members.map((member) => (
    <ProcessLine key={member.id} machineProcess={member} />
  ));

  return (
    <>
      <li>
        <h3>{heading}</h3>
      </li>
      {processLines}
    </>
  );
}

// Sim Manager hands out the numbers. The address opens the machine's page.
function ProcessLine({ machineProcess }: { machineProcess: MachineProcess }) {
  const { number, url, program, pid } = machineProcess;
  const programDetails = `${program}, PID ${pid ?? 'none'}`;
  const host = new URL(url).host;

  return (
    <li>
      <b title={programDetails}>{number}</b>
      <a href={url} target="_blank" rel="noreferrer">
        {host}
      </a>
    </li>
  );
}
