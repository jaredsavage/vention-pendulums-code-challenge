import type { Point } from '@repo/protocol';
import { canvasStyle } from './canvasStyle.ts';
import type { Pendulum } from './types.ts';

const ORBS_PER_PENDULUM = 9;
const ORB_RADIUS = 1;
const SIZE_VARIATION = 0.35;
const SPEED_VARIATION = 0.3;

// Factors of the string length, so the patch scales with the pendulum.
const TRIP_LENGTH = 0.9;
const LANE_SPREAD = 0.6;

// Factor of each trip spent fading in, and again fading out.
const FADE_LENGTH = 0.2;

// About how many seconds of swinging the patch centres on.
const MEMORY = 3;

// Real wind is too fast to follow, so orbs speed up with its log instead.
// At 3 m/s, an orb makes this many trips a second.
const REFERENCE_WIND = 3;
const REFERENCE_TRIP_RATE = 0.17;

type Windy = Pendulum & { wind: Point };

// Side and jitters are picked once, from -1 to 1, so each orb keeps its own
// path and pace. It keeps its wind until the trip's done, so a change only
// shows on new trips.
interface Orb {
  side: number;
  speedJitter: number;
  sizeJitter: number;
  progress: number;
  rate: number;
  direction: Point;
  at: number;
}

// Offsets are factors of the string length, so zooming doesn't move them.
const recentOffsets = new Map<string, { offset: Point; at: number }>();
const orbs = new Map<string, Orb>();

// Orbs drift with the wind around where each bob's been lately. Drawn under
// the pendulums, so bobs pass over them.
export function drawWind(
  ctx: CanvasRenderingContext2D,
  pendulums: Pendulum[],
  now: number,
) {
  ctx.save();
  ctx.fillStyle = canvasStyle.foreground;

  const windy = pendulums.filter(hasWind);

  for (const pendulum of windy) {
    drawOrbsAround(ctx, pendulum, now);
  }

  ctx.restore();
}

function hasWind(pendulum: Pendulum): pendulum is Windy {
  const { wind } = pendulum;

  return wind !== undefined && (wind.x !== 0 || wind.y !== 0);
}

function drawOrbsAround(
  ctx: CanvasRenderingContext2D,
  pendulum: Windy,
  now: number,
) {
  const { id, wind, length } = pendulum;
  const centre = recentCentre(pendulum, now);
  const windSpeed = Math.hypot(wind.x, wind.y);
  const direction = { x: wind.x / windSpeed, y: wind.y / windSpeed };

  for (let index = 0; index < ORBS_PER_PENDULUM; index++) {
    const orb = advanceOrb(`${id}:${index}`, windSpeed, direction, now);
    const across = { x: -orb.direction.y, y: orb.direction.x };
    const lane = along(centre, across, orb.side * LANE_SPREAD * length);

    drawOrb(ctx, orb, lane, length);
  }
}

function drawOrb(
  ctx: CanvasRenderingContext2D,
  { progress, direction, sizeJitter }: Orb,
  lane: Point,
  stringLength: number,
) {
  const tripLength = TRIP_LENGTH * stringLength;
  const start = along(lane, direction, -tripLength / 2);
  const position = along(start, direction, progress * tripLength);

  const sizeFactor = 1 + sizeJitter * SIZE_VARIATION;
  const radius = ORB_RADIUS * sizeFactor;
  const fadeIn = progress / FADE_LENGTH;
  const fadeOut = (1 - progress) / FADE_LENGTH;

  ctx.globalAlpha = Math.min(1, fadeIn, fadeOut);
  ctx.beginPath();
  ctx.arc(position.x, position.y, radius, 0, 2 * Math.PI);
  ctx.fill();
}

// Moves an orb along, and starts it over at the end of its trip. New orbs
// start partway, so they don't all set out together.
function advanceOrb(
  key: string,
  windSpeed: number,
  direction: Point,
  now: number,
) {
  const orb = orbs.get(key) ?? newOrb(now);
  const elapsed = (now - orb.at) / 1000;

  orb.progress += elapsed * orb.rate;
  orb.at = now;
  orbs.set(key, orb);

  const setsOut = orb.rate === 0 || orb.progress >= 1;
  if (setsOut) {
    const speedFactor = 1 + orb.speedJitter * SPEED_VARIATION;

    orb.progress %= 1;
    orb.rate = tripRate(windSpeed) * speedFactor;
    orb.direction = direction;
  }

  return orb;
}

function newOrb(now: number): Orb {
  return {
    side: randomSigned(),
    speedJitter: randomSigned(),
    sizeJitter: randomSigned(),
    progress: Math.random(),
    rate: 0,
    direction: { x: 0, y: 0 },
    at: now,
  };
}

// From -1 to 1.
function randomSigned() {
  return Math.random() * 2 - 1;
}

// Where the bob's been lately. Settles where it swings, even when the wind
// holds it to one side.
function recentCentre({ id, anchor, bob, length }: Windy, now: number) {
  const bobOffset = {
    x: (bob.x - anchor.x) / length,
    y: (bob.y - anchor.y) / length,
  };
  const offset = averageOffset(id, bobOffset, now);

  return along(anchor, offset, length);
}

// Running average that forgets over a few seconds.
function averageOffset(id: string, bobOffset: Point, now: number) {
  const previous = recentOffsets.get(id) ?? { offset: bobOffset, at: now };
  const elapsed = (now - previous.at) / 1000;
  const weight = 1 - Math.exp(-elapsed / MEMORY);

  const from = previous.offset;
  const offset = {
    x: from.x + (bobOffset.x - from.x) * weight,
    y: from.y + (bobOffset.y - from.y) * weight,
  };

  recentOffsets.set(id, { offset, at: now });

  return offset;
}

// Trips per second.
function tripRate(windSpeed: number) {
  const growth = Math.log1p(windSpeed) / Math.log1p(REFERENCE_WIND);

  return REFERENCE_TRIP_RATE * growth;
}

function along(point: Point, direction: Point, distance: number) {
  return {
    x: point.x + direction.x * distance,
    y: point.y + direction.y * distance,
  };
}
