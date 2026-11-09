import type { KeyboardEvent } from 'react';
import {
  PROPERTY_FIELDS,
  type MachineCommand,
  type MachineProperties,
  type MachineState,
  type ObservedMachine,
  type Point,
} from '@repo/protocol';

type PropertyName = (typeof PROPERTY_FIELDS)[number]['name'];

// How far − and + move each property.
const STEPS: Record<PropertyName, number> = {
  length: 0.05,
  initialAngle: 5,
  radius: 0.01,
  mass: 0.1,
  dragCoefficient: 0.05,
};

const ANCHOR_STEP = 0.05;

type Configure = (command: MachineCommand) => Promise<unknown>;

interface Props {
  machine: ObservedMachine;
  machines: ObservedMachine[];
  configure: Configure;
  editing: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
}

// The selected machine: how it's doing, and what can be changed on it. It all
// comes from what the machine last reported, and the machine decides what to
// accept.
export function MachinePanel({
  machine,
  machines,
  configure,
  editing,
  onSelect,
  onClose,
}: Props) {
  const { id, name, url, online, state } = machine;

  const closeButton = (
    <button type="button" aria-label="Close" onClick={onClose}>
      ×
    </button>
  );

  const heading = (
    <h2>
      {name}
      <small>
        <MachineLinks url={url} />
      </small>
    </h2>
  );

  if (!state) {
    return (
      <aside data-blueprint={editing}>
        {closeButton}
        {heading}
        <p>Waiting for its first report.</p>
      </aside>
    );
  }

  const { status, reason, properties } = state;
  const peers = machines.filter((peer) => peer.id !== id);
  const statusLine = online ? (
    <>
      <b>{status}</b>
      {reason}
    </>
  ) : (
    <>
      <b>offline</b>
      Showing its last report
    </>
  );

  return (
    <aside data-blueprint={editing}>
      {closeButton}
      {heading}
      <p role="status">{statusLine}</p>
      <Anchor
        anchor={properties.anchor}
        configure={configure}
        editing={editing}
      />
      <Properties
        properties={properties}
        configure={configure}
        editing={editing}
      />
      <Neighbours state={state} peers={peers} onSelect={onSelect} />
    </aside>
  );
}

interface AnchorProps {
  anchor: Point;
  configure: Configure;
  editing: boolean;
}

function Anchor({ anchor, configure, editing }: AnchorProps) {
  function moveAnchor(moved: Point) {
    void configure({ type: 'SET_PROPERTIES', changes: { anchor: moved } });
  }

  return (
    <section>
      <h3>Anchor</h3>
      <Stepper
        label="X (m)"
        value={anchor.x}
        step={ANCHOR_STEP}
        editing={editing}
        onCommit={(x) => moveAnchor({ ...anchor, x })}
      />
      <Stepper
        label="Y (m)"
        value={anchor.y}
        step={ANCHOR_STEP}
        editing={editing}
        onCommit={(y) => moveAnchor({ ...anchor, y })}
      />
    </section>
  );
}

interface PropertiesProps {
  properties: MachineProperties;
  configure: Configure;
  editing: boolean;
}

function Properties({ properties, configure, editing }: PropertiesProps) {
  function changeProperty(name: PropertyName, value: number) {
    void configure({ type: 'SET_PROPERTIES', changes: { [name]: value } });
  }

  const rows = PROPERTY_FIELDS.map(({ name, label, unit }) => (
    <Stepper
      key={name}
      label={unit ? `${label} (${unit})` : label}
      value={properties[name]}
      step={STEPS[name]}
      editing={editing}
      onCommit={(value) => changeProperty(name, value)}
    />
  ));

  return (
    <section>
      <h3>Properties</h3>
      {rows}
    </section>
  );
}

interface StepperProps {
  label: string;
  value: number;
  step: number;
  editing: boolean;
  onCommit: (value: number) => void;
}

// A value with − and + either side while editing. A step, or a value typed
// and entered, is sent straight away. Otherwise it's just the value.
function Stepper({ label, value, step, editing, onCommit }: StepperProps) {
  const lower = () => onCommit(roundToThousandths(value - step));
  const raise = () => onCommit(roundToThousandths(value + step));

  if (!editing) {
    return (
      <div>
        {label}
        <output>{value}</output>
      </div>
    );
  }

  return (
    <div>
      {label}
      <button type="button" aria-label={`Lower ${label}`} onClick={lower}>
        −
      </button>
      <ValueField label={label} value={value} onCommit={onCommit} />
      <button type="button" aria-label={`Raise ${label}`} onClick={raise}>
        +
      </button>
    </div>
  );
}

interface ValueFieldProps {
  label: string;
  value: number;
  onCommit: (value: number) => void;
}

// Sends what's typed once it's left or entered. Anything that isn't a new
// number puts the value back.
function ValueField({ label, value, onCommit }: ValueFieldProps) {
  function commit(input: HTMLInputElement) {
    const typed = Number(input.value);
    const isNumber = input.value.trim() !== '' && Number.isFinite(typed);
    const nothingToSend = !isNumber || typed === value;
    if (nothingToSend) {
      input.value = String(value);

      return;
    }

    onCommit(typed);
  }

  function blurOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
  }

  return (
    <input
      key={value}
      inputMode="decimal"
      aria-label={label}
      defaultValue={value}
      onBlur={({ currentTarget }) => commit(currentTarget)}
      onKeyDown={blurOnEnter}
    />
  );
}

interface NeighboursProps {
  state: MachineState;
  peers: ObservedMachine[];
  onSelect: (id: string) => void;
}

// The neighbours, one row each, then a count of the rest of the group.
function Neighbours({ state, peers, onSelect }: NeighboursProps) {
  const { neighbours, connectedPeers } = state;
  const isNeighbour = ({ id }: ObservedMachine) => neighbours.includes(id);
  const isConnected = ({ id }: ObservedMachine) => connectedPeers.includes(id);

  const rows = peers.filter(isNeighbour).map((peer) => {
    const connected = isConnected(peer);
    const label = connected ? 'Connected' : 'Not connected';

    return (
      <li key={peer.id}>
        <span
          role="img"
          aria-label={label}
          title={label}
          data-connected={connected}
        />
        <button type="button" onClick={() => onSelect(peer.id)}>
          {peer.name}
        </button>
        <small>
          <MachineLinks url={peer.url} />
        </small>
      </li>
    );
  });

  const others = peers.filter((peer) => !isNeighbour(peer));
  const connectedOthers = others.filter(isConnected);
  const connectionWord =
    connectedOthers.length === 1 ? 'connection' : 'connections';
  const otherNames = others.map((peer) =>
    isConnected(peer) ? peer.name : `${peer.name} (not connected)`,
  );

  const neighbourList = rows.length > 0 ? <ul>{rows}</ul> : <p>None</p>;
  const othersCount = others.length > 0 && (
    <p>
      <small title={otherNames.join('\n')}>
        {connectedOthers.length} other {connectionWord}
      </small>
    </p>
  );

  return (
    <section>
      <h3>Neighbours</h3>
      {neighbourList}
      {othersCount}
    </section>
  );
}

interface MachineLinksProps {
  url: string;
}

// A machine's page, by its address, and its logs.
function MachineLinks({ url }: MachineLinksProps) {
  const host = new URL(url).host;
  const hostLink = (
    <a href={url} target="_blank" rel="noreferrer">
      {host}
    </a>
  );
  const logsLink = (
    <a href={`${url}/logs`} target="_blank" rel="noreferrer">
      logs
    </a>
  );

  return (
    <>
      {hostLink} ({logsLink})
    </>
  );
}

// Steps add up in floating point, so 2.80 + 0.05 stays 2.85.
function roundToThousandths(value: number) {
  return Math.round(value * 1000) / 1000;
}
