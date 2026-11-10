import { Activity, useState } from 'react';
import type { Command, GroupState, Result } from '@repo/protocol';
import { GroupCommands } from './GroupCommands.tsx';
import { GroupScene } from './GroupScene.tsx';
import { MachinePanel } from './MachinePanel.tsx';
import { NetworkView } from './NetworkView.tsx';
import { HOME_VIEW } from './Scene/view.ts';
import type { SendMachineCommand } from './useCommandQueue.ts';

export const GROUP_VIEWS = [
  { name: 'scene', label: 'Scene', hint: 'Pendulums as they swing' },
  { name: 'network', label: 'Network', hint: 'Connections between machines' },
] as const;

export type GroupView = (typeof GROUP_VIEWS)[number]['name'];

interface Props {
  group: GroupState;
  view: GroupView;
  updateHz: number;
  send: (command: Command) => Promise<Result>;
  setEditing: (editing: boolean) => Promise<Result>;
  configure: SendMachineCommand;
}

// One group's commands and views, shown in its own tab.
export function GroupDashboard({
  group,
  view,
  updateHz,
  send,
  setEditing,
  configure,
}: Props) {
  const [selectedId, setSelectedId] = useState('');
  const [sceneView, setSceneView] = useState(HOME_VIEW);

  // Edit mode belongs to the group, so every page sees the same.
  const { machines, editing } = group;
  const selected = machines.find(({ id }) => id === selectedId);
  const onScene = view === 'scene';

  // Selecting a machine shows its panel. Selecting it again hides it.
  function selectMachine(id: string) {
    setSelectedId(id === selectedId ? '' : id);
  }

  const sceneMoved = sceneView !== HOME_VIEW;
  const resetViewButton = onScene && sceneMoved && (
    <button type="button" onClick={() => setSceneView(HOME_VIEW)}>
      Reset view
    </button>
  );

  // Edit mode belongs to the scene, where you can see what you're changing.
  const commands = (
    <GroupCommands
      machines={machines}
      send={send}
      canEdit={onScene}
      editing={editing}
      onEditingChange={setEditing}
    >
      {resetViewButton}
    </GroupCommands>
  );

  // Hidden rather than removed behind the network, so it carries on from where
  // it was.
  const sceneMode = onScene ? 'visible' : 'hidden';
  const scene = (
    <Activity mode={sceneMode}>
      <GroupScene
        group={group}
        updateHz={updateHz}
        selectedId={selected?.id}
        onSelect={selectMachine}
        configure={configure}
        editing={editing}
        view={sceneView}
        onViewChange={setSceneView}
      />
    </Activity>
  );

  const network = view === 'network' && (
    <NetworkView
      machines={machines}
      selectedId={selected?.id}
      onSelect={selectMachine}
    />
  );

  // Only beside the scene, where you can see the machine change. Other views
  // keep the selection and show it their own way.
  const showPanel = selected && onScene;
  const machinePanel = showPanel && (
    <MachinePanel
      machine={selected}
      machines={machines}
      configure={(command) => configure(selected.id, command)}
      editing={editing}
      onSelect={selectMachine}
      onClose={() => setSelectedId('')}
    />
  );

  return (
    <article>
      <section>
        {commands}
        {scene}
        {network}
      </section>
      {machinePanel}
    </article>
  );
}
