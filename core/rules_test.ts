import { assertEquals } from "@std/assert";
import {
  apply,
  type GameState,
  isPassable,
  letterAt,
  terrainAt,
} from "./mod.ts";

// Each test has a Given-When-Then shape: https://martinfowler.com/bliki/GivenWhenThen.html
const SEED = 121;

// A state with the player just west of a cell that is, or is not, passable.
// Searching keeps these tests honest if the terrain formula changes.
function besideEasternCell(passable: boolean): GameState {
  for (let x = 2; x < 10_000; x++) {
    const here = isPassable(terrainAt(SEED, x, 0));
    const east = isPassable(terrainAt(SEED, x + 1, 0));
    if (
      here &&
      east === passable &&
      (!passable || letterAt(SEED, x + 1, 0) === null)
    ) {
      return {
        seed: SEED,
        player: { x, y: 0 },
        collectedCells: [],
        collectedLetters: [],
        craftedItems: [],
      };
    }
  }
  throw new Error("Found no suitable cell on this row.");
}

function besideEasternLetter(): GameState {
  for (let x = 2; x < 10_000; x++) {
    const here = isPassable(terrainAt(SEED, x, 0));
    const currentLetter = letterAt(SEED, x, 0);
    const eastLetter = letterAt(SEED, x + 1, 0);

    if (here && currentLetter === null && eastLetter !== null) {
      return {
        seed: SEED,
        player: { x, y: 0 },
        collectedCells: [],
        collectedLetters: [],
        craftedItems: [],
      };
    }
  }

  throw new Error("Found no suitable letter cell on this row.");
}

Deno.test("moving onto passable terrain moves the player", () => {
  const state = besideEasternCell(true);
  const { x, y } = state.player;

  const events = apply(state, { type: "move", direction: "east" });

  assertEquals(state.player, { x: x + 1, y });
  assertEquals(events, [{
    type: "moved",
    from: { x, y },
    to: { x: x + 1, y },
  }]);
});

Deno.test("a blocked move changes nothing and reports why", () => {
  const state = besideEasternCell(false);
  const snapshot = JSON.parse(JSON.stringify(state));
  const { x, y } = state.player;
  const target = { x: x + 1, y };

  const events = apply(state, { type: "move", direction: "east" });

  assertEquals(state, snapshot);
  assertEquals(events, [{
    type: "blocked",
    at: { x, y },
    toward: target,
    terrain: terrainAt(SEED, target.x, target.y),
  }]);
});

Deno.test("an event keeps its cells while state moves on", () => {
  const state = besideEasternCell(true);
  const { x, y } = state.player;

  const first = apply(state, { type: "move", direction: "east" });
  const second = apply(state, { type: "move", direction: "west" });
  apply(state, { type: "move", direction: "east" });

  // Both retained events still report the cells from when they happened, even
  // though state.player has since changed.
  assertEquals(first, [{
    type: "moved",
    from: { x, y },
    to: { x: x + 1, y },
  }]);
  assertEquals(second, [{
    type: "moved",
    from: { x: x + 1, y },
    to: { x, y },
  }]);
});

Deno.test("moving onto a letter cell collects its letter", () => {
  const state = besideEasternLetter();
  const { x, y } = state.player;
  const target = { x: x + 1, y };
  const letter = letterAt(SEED, target.x, target.y);

  const events = apply(state, { type: "move", direction: "east" });

  assertEquals(letter !== null, true);
  assertEquals(events, [
    {
      type: "moved",
      from: { x, y },
      to: target,
    },
    {
      type: "collected",
      at: target,
      letter: letter!,
    },
  ]);
  assertEquals(state.collectedLetters, [letter]);
  assertEquals(state.collectedCells, [`${target.x},${target.y}`]);
});

Deno.test("the same letter cell cannot be collected twice", () => {
  const state = besideEasternLetter();

  apply(state, { type: "move", direction: "east" });
  apply(state, { type: "move", direction: "west" });

  const events = apply(state, { type: "move", direction: "east" });

  assertEquals(events.length, 1);
  assertEquals(events[0].type, "moved");
  assertEquals(state.collectedLetters.length, 1);
  assertEquals(state.collectedCells.length, 1);
});
