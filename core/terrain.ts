// The world is a pure function of a seed and coordinates. Nothing here is stored,
// so the world can be effectively unbounded while saved state stays small.

export type Terrain = "grass" | "forest" | "water" | "rock";

export function terrainAt(seed: number, x: number, y: number): Terrain {
  const raw = 0.65 * noise(seed, x, y, 9) + 0.35 * noise(seed + 1, x, y, 3);
  // Every game starts at the origin, so flatten the land there. Otherwise some
  // seeds would start inside a lake or walled into a pocket.
  const height = 0.5 + (raw - 0.5) * Math.min(1, Math.hypot(x, y) / 10);
  if (height < 0.3) return "water";
  if (height > 0.7) return "rock";
  if (Math.min(1, Math.hypot(x, y) / 10) < 1) return "grass";
  return noise(seed + 2, x, y, 6) < 0.45 ? "forest" : "grass";
}

export function isPassable(terrain: Terrain): boolean {
  return terrain !== "water" && terrain !== "rock";
}

const LETTERS: [string, number][] = [
  ["E", .19],
  ["S", .27],
  ["I", .34],
  ["A", .41],
  ["R", .48],
  ["N", .54],
  ["T", .60],
  ["O", .65],
  ["L", .70],
  ["C", .74],
  ["D", .78],
  ["U", .80],
  ["G", .84],
  ["P", .86],
  ["M", .88],
  ["H", .90],
  ["B", .92],
  ["Y", .94],
  ["F", .94],
  ["V", .95],
  ["K", .96],
  ["Z", .97],
  ["X", .98],
  ["J", .99],
  ["Q", 1],
];

/**
 * Returns the letter at a world coordinate, or null if there is none.
 * Letter placement is deterministic: the same seed and coordinates
 * always produce the same result.
 */
export function letterAt(
  seed: number,
  x: number,
  y: number,
): string | null {
  if (!isPassable(terrainAt(seed, x, y))) return null;

  const chance = noise(seed + 3, x, y, 1);

  // Only 8% of passable cells contain a letter.
  if (chance >= 0.08) return null;

  const index = noise(seed + 4, x, y, 1);
  for (const [letter, weight] of LETTERS) {
    if (index < weight) return letter;
  }
  return "BUGGED";
}

// Value noise: random numbers at coarse grid points, blended between them, so
// that terrain forms regions instead of static.
function noise(seed: number, x: number, y: number, scale: number): number {
  const left = Math.floor(x / scale);
  const top = Math.floor(y / scale);
  const blendX = smooth(x / scale - left);
  const blendY = smooth(y / scale - top);
  return mix(
    mix(gridValue(seed, left, top), gridValue(seed, left + 1, top), blendX),
    mix(
      gridValue(seed, left, top + 1),
      gridValue(seed, left + 1, top + 1),
      blendX,
    ),
    blendY,
  );
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// A hash, not a generator: the same inputs give the same number in [0, 1), with
// no memory of earlier calls.
function gridValue(seed: number, x: number, y: number): number {
  let hash = Math.imul(seed, 0x9e3779b1) ^ Math.imul(x, 0x85ebca6b) ^
    Math.imul(y, 0xc2b2ae35);
  hash = Math.imul(hash ^ (hash >>> 15), 0x2c1b3c6d);
  hash = Math.imul(hash ^ (hash >>> 12), 0x297a2d39);
  return ((hash ^ (hash >>> 15)) >>> 0) / 2 ** 32;
}
