import { useState } from 'react';
import type { GroupState } from '@repo/protocol';
import {
  GROUP_VIEWS,
  GroupDashboard,
  type GroupView,
} from './GroupDashboard.tsx';
import { useSupervisor } from './useSupervisor.ts';

export function App() {
  const [view, setView] = useState<GroupView>('scene');
  const [openGroupId, setOpenGroupId] = useState('');
  const { groups, updateHz, connected, error, send, configure } =
    useSupervisor();

  // A new group never takes over the page. If the open one goes, the first
  // group takes its place.
  const openGroup = groups.find(({ id }) => id === openGroupId) ?? groups[0];

  const groupTabs = groups.map((group) => (
    <button
      key={group.id}
      type="button"
      aria-pressed={group.id === openGroup?.id}
      onClick={() => setOpenGroupId(group.id)}
    >
      {group.id} <small>{group.machines.length}</small>
    </button>
  ));

  // A group only exists while it has machines, so no group means none. Once
  // the connection's lost, the overlay says so instead.
  const noMachinesNote = connected && <p>No machines connected</p>;
  const dashboard = openGroup ? (
    <GroupDashboard
      key={openGroup.id}
      group={openGroup}
      view={view}
      updateHz={updateHz}
      send={(command) => send(openGroup.id, command)}
      configure={(machineId, command) =>
        configure(openGroup.id, machineId, command)
      }
    />
  ) : (
    noMachinesNote
  );

  // Covers the page once the supervisor's stream has dropped.
  const connectionLost = !connected && (
    <div role="status" data-connection-lost>
      Connection lost
    </div>
  );

  return (
    <>
      <Header
        groups={groups}
        connected={connected}
        error={error}
        view={view}
        onViewChange={setView}
      />
      <nav aria-label="Groups">{groupTabs}</nav>
      {dashboard}
      {connectionLost}
    </>
  );
}

interface HeaderProps {
  groups: GroupState[];
  connected: boolean;
  error: string | null;
  view: GroupView;
  onViewChange: (view: GroupView) => void;
}

// The page's name, the view switch, and how many machines are online across
// every group.
function Header({ groups, connected, error, view, onViewChange }: HeaderProps) {
  // Sim Manager shows this page in a frame, so it offers its own tab.
  const inFrame = window.self !== window.top;
  const pageUrl = window.location.href;
  const openLabel = `Open ${pageUrl} in a new tab`;
  const openInTab = inFrame && (
    <a href={pageUrl} target="_blank" rel="noreferrer" title={openLabel}>
      <svg viewBox="0 0 12 12" aria-label={openLabel}>
        <path d="M5 2H2v8h8V7M7 1h4v4M11 1 5.5 6.5" />
      </svg>
    </a>
  );

  const machines = groups.flatMap((group) => group.machines);
  const onlineCount = machines.filter(({ online }) => online).length;
  const machineCount = `${onlineCount}/${machines.length}`;
  const groupCount = groups.length;
  const groupLabel = groupCount === 1 ? 'group' : 'groups';

  const onlineSummary = (
    <>
      <b>{groupCount}</b> {groupLabel} · <b>{machineCount}</b> machines online
    </>
  );
  const statusMessage = connected ? onlineSummary : 'Connecting to supervisor';

  const viewButtons = GROUP_VIEWS.map(({ name, label, hint }) => (
    <button
      key={name}
      type="button"
      title={hint}
      aria-pressed={view === name}
      onClick={() => onViewChange(name)}
    >
      {label}
    </button>
  ));

  return (
    <header>
      <h1>
        Supervisor {openInTab}
        <small>Watch and control machine groups</small>
      </h1>
      <div role="group" aria-label="View">
        {viewButtons}
      </div>
      <p role="status">{statusMessage}</p>
      {error && <p role="alert">{error}</p>}
    </header>
  );
}
