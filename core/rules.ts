// The rules of the game. There is no clock here: a command updates the state at
// once, and the events it returns are a record of what happened. Whoever called
// apply() decides how, or whether, to show them over time.

import { RECIPES } from "./recipes.ts";
import { letterAt, type Terrain, terrainAt } from "./terrain.ts";

export type Cell = { x: number; y: number };

export type Direction = "north" | "south" | "east" | "west";

// Plain data that survives JSON. Terrain is absent because the seed can recompute
// it: besides the seed, only what the player has caused belongs here.
export type GameState = {
  seed: number;
  player: Cell;
  collectedCells: string[];
  collectedLetters: string[];
  craftedItems: string[];
};

// Command: https://gameprogrammingpatterns.com/command.html
export type Command =
  | { type: "move"; direction: Direction }
  | { type: "craft"; recipeId: string };

// Domain Event: https://martinfowler.com/eaaDev/DomainEvent.html
export type GameEvent =
  | { type: "moved"; from: Cell; to: Cell }
  | { type: "blocked"; at: Cell; toward: Cell; terrain: Terrain }
  | { type: "collected"; at: Cell; letter: string }
  | { type: "crafted"; recipeId: string; emoji: string }
  | {
    type: "craft-failed";
    recipeId: string;
    reason: "unknown-recipe" | "missing-letters" | "already-owned";
  };

const STEPS: Record<Direction, Cell> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

// Singleton, avoided on purpose: tests make as many games as they need. https://gameprogrammingpatterns.com/singleton.html
export function newGame(seed: number): GameState {
  return {
    seed,
    player: { x: 0, y: 0 },
    collectedCells: [],
    collectedLetters: [],
    craftedItems: [],
  };
}

// The single way in. It updates the state it is given and returns the events.
export function apply(state: GameState, command: Command): GameEvent[] {
  switch (command.type) {
    case "move":
      return move(state, command.direction);
    case "craft":
      return craft(state, command.recipeId);
  }
}

function move(state: GameState, direction: Direction): GameEvent[] {
  const step = STEPS[direction];
  // Events are retained and played back later, while state keeps changing. So an
  // event gets cells of its own, never an object that state still holds.
  // Aliasing Bug: https://martinfowler.com/bliki/AliasingBug.html
  // Cells in events act as a Value Object: https://martinfowler.com/bliki/ValueObject.html
  const from = { ...state.player };
  const to = { x: from.x + step.x, y: from.y + step.y };
  const terrain = terrainAt(state.seed, to.x, to.y);

  const canEnter = terrain === "grass" ||
    (terrain === "forest" && state.craftedItems.includes("axe")) ||
    (terrain === "water" && state.craftedItems.includes("boat")) ||
    (terrain === "rock" && state.craftedItems.includes("pickaxe"));

  if (!canEnter) {
    return [{ type: "blocked", at: from, toward: to, terrain }];
  }

  state.player.x = to.x;
  state.player.y = to.y;

  const events: GameEvent[] = [{ type: "moved", from, to }];

  const cellKey = `${to.x},${to.y}`;

  if (!state.collectedCells.includes(cellKey)) {
    const letter = letterAt(state.seed, to.x, to.y);

    if (letter !== null) {
      state.collectedCells.push(cellKey);
      state.collectedLetters.push(letter);
      events.push({
        type: "collected",
        at: { ...to },
        letter,
      });
    }
  }

  return events;
}

function craft(state: GameState, recipeId: string): GameEvent[] {
  const recipe = RECIPES.find((item) => item.id === recipeId);

  if (!recipe) {
    return [{
      type: "craft-failed",
      recipeId,
      reason: "unknown-recipe",
    }];
  }

  // Do not craft an item the player already owns.
  if (state.craftedItems.includes(recipe.id)) {
    return [{
      type: "craft-failed",
      recipeId,
      reason: "already-owned",
    }];
  }

  // Work with a copy so failed crafting never consumes letters.
  const available = [...state.collectedLetters];

  for (const letter of recipe.letters) {
    const index = available.indexOf(letter);

    if (index === -1) {
      return [{
        type: "craft-failed",
        recipeId,
        reason: "missing-letters",
      }];
    }

    available.splice(index, 1);
  }

  // Consume the required letters.
  state.collectedLetters = available;

  // Add the crafted item to the inventory.
  state.craftedItems.push(recipe.id);

  return [{
    type: "crafted",
    recipeId: recipe.id,
    emoji: recipe.emoji,
  }];
}
