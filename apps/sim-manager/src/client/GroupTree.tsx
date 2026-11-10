import { useId, useState, type KeyboardEvent } from 'react';
import type { Result } from '@repo/protocol';
import type { MachineProcess, SavedGroup } from '../state.ts';
import { ActionMenu } from './ActionMenu.tsx';
import { api } from './api.ts';

// Sends a request, and shows what's wrong if Sim Manager refuses it.
type Ask = (request: Promise<Result>) => Promise<Result>;

interface Props {
  groups: SavedGroup[];
  selected: string[];
  processes: MachineProcess[];
}

// What the name field is open for: a new group, a duplicate of one, or a new
// name for one.
interface Naming {
  duplicateOf?: SavedGroup;
  renaming?: SavedGroup;
}

// The group files, ticked while they run, with each one's machines under it,
// and a way to make new ones.
export function GroupTree({ groups, selected, processes }: Props) {
  const [naming, setNaming] = useState<Naming>();
  const [error, setError] = useState<string | null>(null);

  // A refusal shows until the next request succeeds.
  async function ask(request: Promise<Result>) {
    const result = await request;
    setError(result.ok ? null : (result.error ?? 'Sim Manager refused that.'));

    return result;
  }

  function toggle(groupFile: string, checked: boolean) {
    const others = selected.filter((file) => file !== groupFile);
    const groupFiles = checked ? [...others, groupFile] : others;

    void ask(api.selectGroups(groupFiles));
  }

  // A refused name keeps its field open, to be fixed.
  async function submitName(name: string) {
    const request = naming?.renaming
      ? api.renameGroup(naming.renaming.file, name)
      : api.createGroup(name, naming?.duplicateOf?.file);
    const result = await ask(request);

    if (result.ok) {
      setNaming(undefined);
    }
  }

  // A group being renamed becomes its name field, where it is. It's off, so it
  // has no machines under it.
  const branches = groups.map((group) =>
    naming?.renaming?.file === group.file ? (
      <NameField
        key={group.file}
        suggestedName={group.id}
        onSubmit={(name) => void submitName(name)}
        onCancel={() => setNaming(undefined)}
      />
    ) : (
      <GroupBranch
        key={group.file}
        group={group}
        running={selected.includes(group.file)}
        machines={processes.filter(({ groupFile }) => groupFile === group.file)}
        ask={ask}
        onToggle={toggle}
        onDuplicate={() => setNaming({ duplicateOf: group })}
        onRename={() => setNaming({ renaming: group })}
      />
    ),
  );

  const nothingRunning = selected.length === 0;
  const groupsMenu = (
    <ActionMenu
      label="Groups menu"
      actions={[
        {
          label: 'New Group',
          title: 'Create a group with one machine',
          onSelect: () => setNaming({}),
        },
        {
          label: 'Shut Down All',
          title: 'Shut down every running group',
          disabled: nothingRunning,
          onSelect: () => void ask(api.selectGroups([])),
        },
        {
          label: 'Reload',
          title: 'Read the group files again, to pick up changes made by hand',
          onSelect: () => void ask(api.reloadGroups()),
        },
      ]}
    />
  );
  const duplicateOf = naming?.duplicateOf;
  const copyName = duplicateOf && `${duplicateOf.id} (copy)`;
  const nameField = naming && !naming.renaming && (
    <NameField
      suggestedName={copyName}
      onSubmit={(name) => void submitName(name)}
      onCancel={() => setNaming(undefined)}
    />
  );

  const errorText = error && <p role="alert">{error}</p>;

  return (
    <section>
      <header>
        <h2>Groups</h2>
        {groupsMenu}
      </header>
      {errorText}
      {nameField}
      {branches}
    </section>
  );
}

interface GroupBranchProps {
  group: SavedGroup;
  running: boolean;
  machines: MachineProcess[];
  ask: Ask;
  onToggle: (groupFile: string, checked: boolean) => void;
  onDuplicate: () => void;
  onRename: () => void;
}

// A group's row, then a line for each of its machines while it has any.
function GroupBranch({
  group,
  running,
  machines,
  ask,
  onToggle,
  onDuplicate,
  onRename,
}: GroupBranchProps) {
  const { file, id } = group;
  const hasMachines = machines.length > 0;
  const switchId = useId();

  // Deleting can't be undone, so it asks first.
  function deleteGroup() {
    const question = `Delete ${id}? Its group file goes too.`;
    if (confirm(question)) {
      void ask(api.deleteGroup(file));
    }
  }

  const groupMenu = (
    <ActionMenu
      label="Group menu"
      actions={[
        {
          label: 'Add Machine',
          title: 'Add a machine beside the others',
          onSelect: () => void ask(api.addMachine(file)),
        },
        {
          label: 'Duplicate',
          title: "Copy this group's setup into a new group",
          onSelect: onDuplicate,
        },
        {
          label: 'Rename',
          title: "Rename the group. Available while it's off.",
          disabled: running,
          onSelect: onRename,
        },
        {
          label: 'Delete',
          title: 'Permanently delete this group and its file',
          onSelect: deleteGroup,
        },
      ]}
    />
  );
  const machineLines = hasMachines && (
    <ul>
      {machines.map((machine) => (
        <MachineLine key={machine.id} machine={machine} ask={ask} />
      ))}
    </ul>
  );

  return (
    <>
      <div>
        <input
          id={switchId}
          type="checkbox"
          role="switch"
          title={running ? 'Shut down group' : 'Start group'}
          checked={running}
          onChange={({ target }) => onToggle(file, target.checked)}
        />
        <label htmlFor={switchId}>{id}</label>
        {groupMenu}
      </div>
      {machineLines}
    </>
  );
}

interface MachineLineProps {
  machine: MachineProcess;
  ask: Ask;
}

// Sim Manager hands out the numbers. The name opens the machine's page, with
// its address beside it.
function MachineLine({ machine, ask }: MachineLineProps) {
  const { id, number, name, url, program, pid } = machine;
  const programDetails = `${program}, PID ${pid ?? 'none'}`;
  const { host } = new URL(url);

  // Deleting can't be undone, so it asks first. The page only sees running
  // machines, not every saved one, so the note covers every case.
  function deleteMachine() {
    const question = `Delete ${name}? Deleting a group's last saved machine also deletes the group.`;
    if (confirm(question)) {
      void ask(api.deleteMachine(id));
    }
  }

  const machineMenu = (
    <ActionMenu
      label="Machine menu"
      actions={[
        {
          label: 'View Logs',
          title: "Open the machine's log",
          onSelect: () => window.open(`${url}/logs`, '_blank', 'noreferrer'),
        },
        {
          label: 'Shut Down',
          title: 'Stop the machine. It stays in the group.',
          onSelect: () => void ask(api.endProcess(id)),
        },
        {
          label: 'Delete',
          title: 'Permanently remove this machine from the group',
          onSelect: deleteMachine,
        },
      ]}
    />
  );

  return (
    <li>
      <b title={programDetails}>{number}</b>
      <a href={url} target="_blank" rel="noreferrer">
        {name}
      </a>
      <small>{host}</small>
      {machineMenu}
    </li>
  );
}

interface NameFieldProps {
  suggestedName: string | undefined;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

// A group's name being typed: a new one above the others, or a rename in its
// own row. Enter uses it, and ×, Escape or leaving the field cancels it.
function NameField({ suggestedName, onSubmit, onCancel }: NameFieldProps) {
  function submitOrCancel(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      onSubmit(event.currentTarget.value);
    }

    if (event.key === 'Escape') {
      onCancel();
    }
  }

  return (
    <div>
      <button
        type="button"
        aria-label="Cancel"
        title="Cancel"
        onClick={onCancel}
      >
        ×
      </button>
      <input
        type="text"
        aria-label="Group name"
        placeholder="Name"
        defaultValue={suggestedName}
        autoFocus
        onBlur={onCancel}
        onKeyDown={submitOrCancel}
      />
    </div>
  );
}
