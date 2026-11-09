import { useState, type KeyboardEvent } from 'react';
import { api } from './api.ts';

interface Props {
  groups: string[];
  selected: string[];
}

// What the name field is open for: a new group, or a copy of a running one.
interface Naming {
  copyOf?: string;
}

// The group files, ticked while they run, and a way to make new ones.
export function GroupList({ groups, selected }: Props) {
  const [naming, setNaming] = useState<Naming>();

  function toggle(group: string, checked: boolean) {
    const others = selected.filter((name) => name !== group);
    const names = checked ? [...others, group] : others;

    api.selectGroups(names);
  }

  function createGroup(name: string) {
    api.createGroup(name, naming?.copyOf);
    setNaming(undefined);
  }

  const rows = groups.map((group) => (
    <GroupRow
      key={group}
      group={group}
      running={selected.includes(group)}
      onToggle={toggle}
      onCopy={() => setNaming({ copyOf: group })}
    />
  ));

  const newButton = (
    <button
      type="button"
      title="Create a new group. It starts with one machine."
      onClick={() => setNaming({})}
    >
      New Group
    </button>
  );
  const copyOf = naming?.copyOf;
  const suggestedName = copyOf && `${groupLabel(copyOf)} (copy)`;
  const nameField = naming && (
    <NameField
      suggestedName={suggestedName}
      onCreate={createGroup}
      onCancel={() => setNaming(undefined)}
    />
  );

  return (
    <section>
      <header>
        <h2>Groups</h2>
        {newButton}
      </header>
      {nameField}
      {rows}
    </section>
  );
}

interface GroupRowProps {
  group: string;
  running: boolean;
  onToggle: (group: string, checked: boolean) => void;
  onCopy: () => void;
}

// Only a running group has machines to save from: back to its own group file,
// or to a copy with a new name.
function GroupRow({ group, running, onToggle, onCopy }: GroupRowProps) {
  const updateButton = (
    <button
      type="button"
      title="Update the group file with the current state"
      onClick={() => api.updateGroup(group)}
    >
      Update
    </button>
  );
  const copyButton = (
    <button
      type="button"
      title="Save the current state as a new group"
      onClick={onCopy}
    >
      Copy
    </button>
  );
  const groupFileButtons = running && (
    <>
      {updateButton}
      {copyButton}
    </>
  );

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={running}
          onChange={({ target }) => onToggle(group, target.checked)}
        />
        {groupLabel(group)}
      </label>
      {groupFileButtons}
    </div>
  );
}

interface NameFieldProps {
  suggestedName: string | undefined;
  onCreate: (name: string) => void;
  onCancel: () => void;
}

// The new group's name, in a row above the others. Enter makes the group, and
// ×, Escape or leaving the field cancels it.
function NameField({ suggestedName, onCreate, onCancel }: NameFieldProps) {
  function createOrCancel(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      onCreate(event.currentTarget.value);
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
        title="Cancel the new group"
        onClick={onCancel}
      >
        ×
      </button>
      <input
        type="text"
        aria-label="New group name"
        placeholder="Name"
        defaultValue={suggestedName}
        autoFocus
        onBlur={onCancel}
        onKeyDown={createOrCancel}
      />
    </div>
  );
}

// How a group file is shown: solar-system is "Solar System".
function groupLabel(group: string) {
  const words = group.split('-');
  const capitalised = words.map(
    (word) => word.charAt(0).toUpperCase() + word.slice(1),
  );

  return capitalised.join(' ');
}
