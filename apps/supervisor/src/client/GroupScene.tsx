import type { GroupState, ObservedMachine, Point } from '@repo/protocol';
import { Scene } from './Scene/Scene.tsx';
import type { Part } from './Scene/pendulumAt.ts';
import type { Link, Pendulum } from './Scene/types.ts';
import type { View } from './Scene/view.ts';
import type { SendMachineCommand } from './useCommandQueue.ts';
import { useDragMachine } from './useDragMachine.ts';

// Where the commands and caption sit over the scene.
const OVERLAY_INSET = { top: 60, bottom: 44 };

interface Props {
  group: GroupState;
  // How often the supervisor's updates arrive, measured by its page.
  updateHz: number;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  configure: SendMachineCommand;
  editing: boolean;
  view: View;
  onViewChange: (change: (view: View) => View) => void;
}

export function GroupScene({
  group,
  updateHz,
  selectedId,
  onSelect,
  configure,
  editing,
  view,
  onViewChange,
}: Props) {
  const { draggableParts, drag, release } = useDragMachine(configure, editing);
  const pendulums = groupPendulums(group, selectedId);
  const links = neighbourLinks(group, selectedId);

  // A machine is dragged from where it last reported itself.
  function dragMachine(id: string, part: Part, point: Point) {
    const state = group.machines.find((machine) => machine.id === id)?.state;
    if (!state) return;

    const target = { id, properties: state.properties, bob: state.position };
    drag(target, part, point);
  }

  return (
    <Scene
      label="Live machine positions. Select a machine to see and change it."
      pendulums={pendulums}
      links={links}
      onSelect={onSelect}
      onDrag={dragMachine}
      onRelease={release}
      draggable={draggableParts}
      blueprint={editing}
      inset={OVERLAY_INSET}
      view={view}
      onViewChange={onViewChange}
    >
      <div>
        Sync rate <b>{updateHz}</b> Hz
      </div>
    </Scene>
  );
}

// Machines that haven't reported yet aren't shown, but still take a number, so
// the numbers match the network view.
function groupPendulums(group: GroupState, selectedId: string | undefined) {
  const pendulums = group.machines.map((machine, index) =>
    machinePendulum(machine, index + 1, selectedId),
  );

  return pendulums.filter((pendulum) => pendulum !== null);
}

function machinePendulum(
  { id, online, state }: ObservedMachine,
  number: number,
  selectedId: string | undefined,
): Pendulum | null {
  if (!state) return null;

  const { position, properties, environment } = state;
  const { anchor, length, radius, icon } = properties;

  // Wind direction is in degrees, clockwise on screen: 0° blows right,
  // 90° down.
  const windSpeed = environment?.windSpeed ?? 0;
  const windDegrees = environment?.windDirection ?? 0;
  const windAngle = (windDegrees * Math.PI) / 180;
  const wind = {
    x: windSpeed * Math.cos(windAngle),
    y: windSpeed * Math.sin(windAngle),
  };

  return {
    id,
    number,
    anchor,
    bob: position,
    length,
    radius,
    icon,
    selected: id === selectedId,
    offline: !online,
    wind,
  };
}

// Links from the selected machine to the neighbours it reports.
function neighbourLinks(group: GroupState, selectedId: string | undefined) {
  const selected = group.machines.find(({ id }) => id === selectedId);
  if (!selected?.state) return [];

  const { neighbours } = selected.state;

  return neighbours.map((neighbourId): Link => [selected.id, neighbourId]);
}
