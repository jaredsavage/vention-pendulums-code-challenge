import type { Environment, MachineProperties, Point } from '@repo/protocol';

// Pendulum angles are radians from straight down. Positive Y points down.
export interface Motion {
  angle: number;
  angularVelocity: number;
}

export function initialMotion({ initialAngle }: MachineProperties): Motion {
  return {
    angle: (initialAngle * Math.PI) / 180,
    angularVelocity: 0,
  };
}

// Fourth-order Runge-Kutta rather than Euler: more work per step, but more
// accurate, and the swing drifts less over time.
export function advanceMotion(
  motion: Motion,
  properties: MachineProperties,
  environment: Environment,
  seconds: number,
): Motion {
  const rate = (state: Motion) => rateOfChange(state, properties, environment);
  const halfStep = seconds / 2;

  const start = rate(motion);
  const middle1 = rate(step(motion, start, halfStep));
  const middle2 = rate(step(motion, middle1, halfStep));
  const end = rate(step(motion, middle2, seconds));

  const average = (field: keyof Motion) =>
    (start[field] + 2 * middle1[field] + 2 * middle2[field] + end[field]) / 6;

  const angle = motion.angle + average('angle') * seconds;
  const angularVelocity =
    motion.angularVelocity + average('angularVelocity') * seconds;

  return {
    angle: Math.atan2(Math.sin(angle), Math.cos(angle)),
    angularVelocity,
  };
}

export function bobCoordinates(
  { angle, angularVelocity }: Motion,
  { anchor, length }: MachineProperties,
): { position: Point; velocity: Point } {
  const x = length * Math.sin(angle);
  const y = length * Math.cos(angle);

  return {
    position: { x: anchor.x + x, y: anchor.y + y },
    velocity: { x: y * angularVelocity, y: -x * angularVelocity },
  };
}

function rateOfChange(
  motion: Motion,
  properties: MachineProperties,
  environment: Environment,
): Motion {
  const gravityPerLength = environment.gravity / properties.length;
  const fromGravity = -gravityPerLength * Math.sin(motion.angle);
  const fromAir = angularAccelerationFromAir(motion, properties, environment);

  return {
    angle: motion.angularVelocity,
    angularVelocity: fromGravity + fromAir,
  };
}

// Drag pushes the bob with the air flowing past it. Only the part of that push
// along the swing turns the pendulum.
function angularAccelerationFromAir(
  motion: Motion,
  properties: MachineProperties,
  environment: Environment,
) {
  const airflow = airflowPastBob(motion, properties, environment);
  const drag = dragForce(airflow, properties, environment);
  const dragAlongSwing = alongSwing(drag, motion.angle);
  const tangentialAcceleration = dragAlongSwing / properties.mass;

  return tangentialAcceleration / properties.length;
}

// The air as the moving bob meets it.
function airflowPastBob(
  motion: Motion,
  properties: MachineProperties,
  environment: Environment,
): Point {
  const bob = bobCoordinates(motion, properties).velocity;
  const wind = windVelocity(environment);

  return { x: wind.x - bob.x, y: wind.y - bob.y };
}

// Wind direction is in degrees, clockwise on screen: 0° blows right, 90° down.
function windVelocity({ windSpeed, windDirection }: Environment): Point {
  const radiansPerDegree = Math.PI / 180;
  const direction = windDirection * radiansPerDegree;

  return {
    x: windSpeed * Math.cos(direction),
    y: windSpeed * Math.sin(direction),
  };
}

// Quadratic drag: it points with the airflow and grows with its speed squared.
function dragForce(
  airflow: Point,
  { radius, dragCoefficient }: MachineProperties,
  { airDensity }: Environment,
): Point {
  const airSpeed = Math.hypot(airflow.x, airflow.y);
  const frontalArea = Math.PI * radius ** 2;
  const dragPerAirflow =
    0.5 * airDensity * dragCoefficient * frontalArea * airSpeed;

  return { x: dragPerAirflow * airflow.x, y: dragPerAirflow * airflow.y };
}

// The part of a force pointing along the swing, towards a larger angle.
function alongSwing(force: Point, angle: number) {
  const fromHorizontal = force.x * Math.cos(angle);
  const fromVertical = force.y * Math.sin(angle);

  return fromHorizontal - fromVertical;
}

function step(motion: Motion, rate: Motion, seconds: number): Motion {
  return {
    angle: motion.angle + rate.angle * seconds,
    angularVelocity: motion.angularVelocity + rate.angularVelocity * seconds,
  };
}
