import type {
  Environment,
  MachineProperties,
  MachinePropertiesPatch,
  Measurement,
} from '@repo/protocol';
import {
  advanceMotion,
  bobCoordinates,
  initialMotion,
  type Motion,
} from './physics.ts';

const STEPS_PER_SECOND = 60;
const STEP_SECONDS = 1 / STEPS_PER_SECOND;
const STEP_MS = 1000 / STEPS_PER_SECOND;

const MAX_CATCH_UP_SECONDS = 0.25;

const GUSTINESS = 0.1;
const GUST_SECONDS = 7;

const SIZES = ['length', 'radius', 'mass'] as const;

export class Pendulum {
  properties: MachineProperties;
  environment: Environment;
  measurement: Measurement;
  held = false;
  private motion: Motion;
  private timer: ReturnType<typeof setInterval> | undefined;
  private lastTick = 0;
  private unsimulatedSeconds = 0;

  constructor(properties: MachineProperties, environment: Environment) {
    this.properties = properties;
    this.environment = environment;
    this.motion = initialMotion(properties);
    this.measurement = this.measure();
  }

  // New properties apply from where it is now, so moving the anchor carries
  // the swing with it.
  setProperties(properties: MachineProperties) {
    this.properties = properties;
    this.measurement = this.measure();
  }

  setEnvironment(changes: Partial<Environment>) {
    this.environment = { ...this.environment, ...changes };
  }

  reset() {
    this.motion = initialMotion(this.properties);
    this.measurement = this.measure();
  }

  run() {
    this.lastTick = Date.now();
    this.unsimulatedSeconds = 0;
    this.timer ??= setInterval(() => this.tick(), STEP_MS);
  }

  pause() {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  // Someone has hold of it: it stays still where it's put, at the given angle
  // if there is one, whatever its status. Once it's let go, it swings from
  // there.
  hold(angle?: number) {
    const heldAngle = angle ?? this.motion.angle;

    this.held = true;
    this.motion = { angle: heldAngle, angularVelocity: 0 };
    this.measurement = this.measure();
  }

  release() {
    this.held = false;
  }

  // Timers drift, so simulate the time that actually passed, in fixed steps.
  private tick() {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastTick) / 1000;
    this.lastTick = now;
    if (this.held) return;

    this.unsimulatedSeconds += Math.min(elapsedSeconds, MAX_CATCH_UP_SECONDS);

    while (this.unsimulatedSeconds >= STEP_SECONDS) {
      this.advance();
      this.unsimulatedSeconds -= STEP_SECONDS;
    }
  }

  private advance() {
    const { motion, properties } = this;
    const environment = gusting(this.environment, Date.now() / 1000);

    this.motion = advanceMotion(motion, properties, environment, STEP_SECONDS);
    this.measurement = this.measure();
  }

  private measure(): Measurement {
    const { position } = bobCoordinates(this.motion, this.properties);

    return { angle: this.motion.angle, position };
  }
}

// The set wind speed, swelling and easing over a slow gust, so the pendulums
// in a steady wind never settle dead still.
function gusting(environment: Environment, seconds: number): Environment {
  const gustPhase = (2 * Math.PI * seconds) / GUST_SECONDS;
  const swell = GUSTINESS * Math.sin(gustPhase);
  const windSpeed = environment.windSpeed * (1 + swell);

  return { ...environment, windSpeed };
}

// What's wrong with a change, if anything, for the machine to refuse it.
export function sizeProblem(changes: MachinePropertiesPatch) {
  const impossible = SIZES.find((size) => {
    const value = changes[size];

    return value !== undefined && value <= 0;
  });

  if (!impossible) return null;

  return `A pendulum's ${impossible} must be more than zero.`;
}
