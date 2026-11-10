import type { Environment, MachineProperties, Point } from '@repo/protocol';

const GUSTINESS = 0.1;
const GUST_SECONDS = 7;

// Angles are radians from straight down. Positive Y points down.
export interface Motion {
  angle: number;
  angularVelocity: number;
}

export function initialMotion({ initialAngle }: MachineProperties): Motion {
  const angle = (initialAngle * Math.PI) / 180;

  return { angle, angularVelocity: 0 };
}

// Fourth-order Runge-Kutta rather than Euler: more work per step, but the
// swing drifts less over time.
export function advanceMotion(
  motion: Motion,
  properties: MachineProperties,
  environment: Environment,
  seconds: number,
): Motion {
  const rate = (from: Motion): Motion => ({
    angle: from.angularVelocity,
    angularVelocity: angularAcceleration(from, properties, environment),
  });
  const halfStep = seconds / 2;

  const start = rate(motion);
  const middle1 = rate(step(motion, start, halfStep));
  const middle2 = rate(step(motion, middle1, halfStep));
  const end = rate(step(motion, middle2, seconds));

  const average = (field: keyof Motion) =>
    (start[field] + 2 * middle1[field] + 2 * middle2[field] + end[field]) / 6;

  const next = step(
    motion,
    { angle: average('angle'), angularVelocity: average('angularVelocity') },
    seconds,
  );
  const wrappedAngle = Math.atan2(Math.sin(next.angle), Math.cos(next.angle));

  return { ...next, angle: wrappedAngle };
}

export function bobPosition(
  { angle }: Motion,
  { anchor, length }: MachineProperties,
): Point {
  const x = anchor.x + length * Math.sin(angle);
  const y = anchor.y + length * Math.cos(angle);

  return { x, y };
}

// The set wind speed, swelling and easing over a slow gust, so pendulums in a
// steady wind never settle dead still.
export function gusting(environment: Environment, seconds: number) {
  const gustPhase = (2 * Math.PI * seconds) / GUST_SECONDS;
  const swell = GUSTINESS * Math.sin(gustPhase);
  const windSpeed = environment.windSpeed * (1 + swell);

  return { ...environment, windSpeed };
}

// Whether two pendulums could ever touch, wherever they swing, with the
// threshold as slack. Those that could are neighbours.
export function couldCollide(
  first: MachineProperties,
  second: MachineProperties,
  threshold: number,
) {
  const anchorDistance = distance(first.anchor, second.anchor);
  const firstReach = first.length + first.radius;
  const secondReach = second.length + second.radius;

  return anchorDistance <= firstReach + secondReach + threshold;
}

// The space between two bob surfaces, or zero once they touch.
export function surfaceGap(
  first: Point,
  firstRadius: number,
  second: Point,
  secondRadius: number,
) {
  const separation = distance(first, second);
  const radii = firstRadius + secondRadius;

  return Math.max(0, separation - radii);
}

// Gravity pulls the bob back down. Quadratic drag pushes it with the air
// flowing past, and only the part of that push along the swing turns it.
function angularAcceleration(
  { angle, angularVelocity }: Motion,
  { length, mass, radius, dragCoefficient }: MachineProperties,
  { gravity, windSpeed, windDirection, airDensity }: Environment,
) {
  const gravityPerLength = gravity / length;
  const fromGravity = -gravityPerLength * Math.sin(angle);

  const swingSpeed = length * angularVelocity;
  const bobVelocity = {
    x: swingSpeed * Math.cos(angle),
    y: -swingSpeed * Math.sin(angle),
  };

  const windRadians = (windDirection * Math.PI) / 180;
  const airflow = {
    x: windSpeed * Math.cos(windRadians) - bobVelocity.x,
    y: windSpeed * Math.sin(windRadians) - bobVelocity.y,
  };

  const airSpeed = Math.hypot(airflow.x, airflow.y);
  const frontalArea = Math.PI * radius ** 2;
  const dragPerAirflow =
    0.5 * airDensity * dragCoefficient * frontalArea * airSpeed;

  const horizontalPart = airflow.x * Math.cos(angle);
  const verticalPart = airflow.y * Math.sin(angle);
  const dragAlongSwing = dragPerAirflow * (horizontalPart - verticalPart);
  const tangentialAcceleration = dragAlongSwing / mass;
  const fromAir = tangentialAcceleration / length;

  return fromGravity + fromAir;
}

function step(motion: Motion, rate: Motion, seconds: number): Motion {
  return {
    angle: motion.angle + rate.angle * seconds,
    angularVelocity: motion.angularVelocity + rate.angularVelocity * seconds,
  };
}

function distance(from: Point, to: Point) {
  return Math.hypot(from.x - to.x, from.y - to.y);
}
