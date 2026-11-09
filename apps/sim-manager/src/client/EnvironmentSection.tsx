import { useState } from 'react';
import { ENVIRONMENT_FIELDS, type Environment } from '@repo/protocol';
import { api } from './api.ts';

type Field = (typeof ENVIRONMENT_FIELDS)[number];

interface SliderRange {
  max: number;
  step: number;
}

const SLIDER_RANGES: Record<keyof Environment, SliderRange> = {
  gravity: { max: 30, step: 0.01 },
  windSpeed: { max: 60, step: 0.1 },
  windDirection: { max: 360, step: 1 },
  airDensity: { max: 2, step: 0.001 },
};

interface Props {
  environments: string[];
  selected: string;
  values: Environment;
}

export function EnvironmentSection({ environments, selected, values }: Props) {
  const environmentSelect = (
    <select
      aria-label="Environment"
      value={selected}
      onChange={({ target }) => api.selectEnvironment(target.value)}
    >
      {environments.map((name) => (
        <option key={name}>{name}</option>
      ))}
    </select>
  );

  // Keyed by the environment too, so picking another starts from its values.
  const sliders = ENVIRONMENT_FIELDS.map((field) => (
    <Slider
      key={`${selected}-${field.name}`}
      field={field}
      initial={values[field.name]}
    />
  ));

  return (
    <section>
      <header>
        <h2>Environment</h2>
        {environmentSelect}
      </header>
      {sliders}
    </section>
  );
}

interface SliderProps {
  field: Field;
  initial: number;
}

// Each change goes straight to the machines.
function Slider({ field, initial }: SliderProps) {
  const { name, label, unit } = field;
  const { max, step } = SLIDER_RANGES[name];
  const [value, setValue] = useState(initial);

  function change(next: number) {
    setValue(next);
    api.changeEnvironment({ [name]: next });
  }

  const windArrow = name === 'windDirection' && <WindArrow degrees={value} />;

  return (
    <label>
      <span>{label}</span>
      <output>
        {windArrow}
        {value} {unit}
      </output>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={({ target }) => change(target.valueAsNumber)}
      />
    </label>
  );
}

// Zero degrees blows to the right, and more turns clockwise, as on the scene.
function WindArrow({ degrees }: { degrees: number }) {
  return (
    <svg viewBox="0 0 12 12" style={{ rotate: `${degrees}deg` }}>
      <path d="M1 6h10M7 2l4 4-4 4" />
    </svg>
  );
}
