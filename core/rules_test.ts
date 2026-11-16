import { assertEquals } from "@std/assert";
import { apply, type GameState, letterAt, terrainAt } from "./mod.ts";

// Each test has a Given-When-Then shape: https://martinfowler.com/bliki/GivenWhenThen.html
const SEED = 121;

// Find a grass cell beside a grass or non-grass cell.
function besideEasternCell(passable: boolean): GameState {
  for (let x = 2; x < 10_000; x++) {
    const here = terrainAt(SEED, x, 0) === "grass";
    const east = terrainAt(SEED, x + 1, 0) === "grass";

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

// Find a grass cell beside a grass cell containing a letter.
function besideEasternLetter(): GameState {
  for (let x = 2; x < 10_000; x++) {
    const here = terrainAt(SEED, x, 0) === "grass";
    const eastIsGrass = terrainAt(SEED, x + 1, 0) === "grass";
    const currentLetter = letterAt(SEED, x, 0);
    const eastLetter = letterAt(SEED, x + 1, 0);

    if (
      here &&
      eastIsGrass &&
      currentLetter === null &&
      eastLetter !== null
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

  throw new Error("Found no suitable letter cell on this row.");
}

// Find a grass cell beside a specific type of terrain.
function besideEasternTerrain(
  targetTerrain: "forest" | "water" | "rock",
  craftedItems: string[] = [],
): GameState {
  for (let x = 2; x < 10_000; x++) {
    const here = terrainAt(SEED, x, 0) === "grass";
    const east = terrainAt(SEED, x + 1, 0) === targetTerrain;

    if (here && east) {
      return {
        seed: SEED,
        player: { x, y: 0 },
        collectedCells: [],
        collectedLetters: [],
        craftedItems: [...craftedItems],
      };
    }
  }

  throw new Error(`Found no grass cell beside ${targetTerrain}.`);
}

// --------------------------------------------------
// Movement tests
// --------------------------------------------------

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

  // Both retained events still report the cells from when they happened.
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

// --------------------------------------------------
// Crafting tests
// --------------------------------------------------

Deno.test("crafting succeeds with the required letters", () => {
  const state: GameState = {
    seed: SEED,
    player: { x: 0, y: 0 },
    collectedCells: [],
    collectedLetters: ["F", "O", "O", "D", "K"],
    craftedItems: [],
  };

  const events = apply(state, { type: "craft", recipeId: "food" });

  assertEquals(events, [{
    type: "crafted",
    recipeId: "food",
    emoji: "🍎",
  }]);

  assertEquals(state.collectedLetters, ["K"]);
  assertEquals(state.craftedItems, ["food"]);
});

Deno.test("crafting works regardless of letter order", () => {
  const state: GameState = {
    seed: SEED,
    player: { x: 0, y: 0 },
    collectedCells: [],
    collectedLetters: ["D", "O", "F", "O"],
    craftedItems: [],
  };

  const events = apply(state, { type: "craft", recipeId: "food" });

  assertEquals(events[0].type, "crafted");
  assertEquals(state.collectedLetters, []);
  assertEquals(state.craftedItems, ["food"]);
});

Deno.test("crafting fails without enough letters and consumes nothing", () => {
  const state: GameState = {
    seed: SEED,
    player: { x: 0, y: 0 },
    collectedCells: [],
    collectedLetters: ["F", "O", "D"],
    craftedItems: [],
  };

  const events = apply(state, { type: "craft", recipeId: "food" });

  assertEquals(events, [{
    type: "craft-failed",
    recipeId: "food",
    reason: "missing-letters",
  }]);

  assertEquals(state.collectedLetters, ["F", "O", "D"]);
  assertEquals(state.craftedItems, []);
});

Deno.test("crafting fails for an unknown recipe", () => {
  const state: GameState = {
    seed: SEED,
    player: { x: 0, y: 0 },
    collectedCells: [],
    collectedLetters: ["K", "E", "Y"],
    craftedItems: [],
  };

  const events = apply(state, {
    type: "craft",
    recipeId: "unknown",
  });

  assertEquals(events, [{
    type: "craft-failed",
    recipeId: "unknown",
    reason: "unknown-recipe",
  }]);

  assertEquals(state.collectedLetters, ["K", "E", "Y"]);
  assertEquals(state.craftedItems, []);
});

Deno.test("an already owned item cannot be crafted again", () => {
  const state: GameState = {
    seed: SEED,
    player: { x: 0, y: 0 },
    collectedCells: [],
    collectedLetters: ["F", "O", "O", "D"],
    craftedItems: ["food"],
  };

  const events = apply(state, { type: "craft", recipeId: "food" });

  assertEquals(events, [{
    type: "craft-failed",
    recipeId: "food",
    reason: "already-owned",
  }]);

  assertEquals(state.collectedLetters, ["F", "O", "O", "D"]);
  assertEquals(state.craftedItems, ["food"]);
});

// --------------------------------------------------
// Area unlocking tests
// --------------------------------------------------

Deno.test("forest blocks movement without an axe", () => {
  const state = besideEasternTerrain("forest");
  const { x, y } = state.player;

  const events = apply(state, { type: "move", direction: "east" });

  assertEquals(state.player, { x, y });
  assertEquals(events[0].type, "blocked");
});

Deno.test("an axe allows movement through forest", () => {
  const state = besideEasternTerrain("forest", ["axe"]);
  const { x, y } = state.player;

  const events = apply(state, { type: "move", direction: "east" });

  assertEquals(state.player, { x: x + 1, y });
  assertEquals(events[0].type, "moved");
});

Deno.test("water blocks movement without a boat", () => {
  const state = besideEasternTerrain("water");
  const { x, y } = state.player;

  const events = apply(state, { type: "move", direction: "east" });

  assertEquals(state.player, { x, y });
  assertEquals(events[0].type, "blocked");
});

Deno.test("a boat allows movement through water", () => {
  const state = besideEasternTerrain("water", ["boat"]);
  const { x, y } = state.player;

  const events = apply(state, { type: "move", direction: "east" });

  assertEquals(state.player, { x: x + 1, y });
  assertEquals(events[0].type, "moved");
});

Deno.test("rock blocks movement without a pickaxe", () => {
  const state = besideEasternTerrain("rock");
  const { x, y } = state.player;

  const events = apply(state, { type: "move", direction: "east" });

  assertEquals(state.player, { x, y });
  assertEquals(events[0].type, "blocked");
});

Deno.test("a pickaxe allows movement through rock", () => {
  const state = besideEasternTerrain("rock", ["pickaxe"]);
  const { x, y } = state.player;

  const events = apply(state, { type: "move", direction: "east" });

  assertEquals(state.player, { x: x + 1, y });
  assertEquals(events[0].type, "moved");
});
