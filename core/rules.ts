// The rules of the game. There is no clock here: a command updates the state at
// once, and the events it returns are a record of what happened. Whoever called
// apply() decides how, or whether, to show them over time.

import { RECIPES } from "./recipes.ts";
import { isPassable, letterAt, type Terrain, terrainAt } from "./terrain.ts";

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
  gameOver: boolean;
};

// Command: https://gameprogrammingpatterns.com/command.html
export type Command =
  | { type: "move"; direction: Direction }
  | { type: "craft"; recipeId: string }
  | { type: "gather" };

// Domain Event: https://martinfowler.com/eaaDev/DomainEvent.html
export type GameEvent =
  | { type: "moved"; from: Cell; to: Cell }
  | { type: "moved"; from: Cell; to: Cell }
  | { type: "blocked"; at: Cell; toward: Cell; terrain: Terrain }
  | { type: "collected"; at: Cell; letter: string }
  | { type: "crafted"; recipeId: string; emoji: string }
  | { type: "gathered"; at: Cell; letter: string }
  | { type: "not-gathered"; at: Cell }
  | {
    type: "craft-failed";
    recipeId: string;
    reason: "unknown-recipe" | "missing-letters" | "already-owned";
  }
  | { type: "end" };

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
    gameOver: false,
  };
}

// The single way in. It updates the state it is given and returns the events.
export function apply(state: GameState, command: Command): GameEvent[] {
  if (state.gameOver) return [];
  switch (command.type) {
    case "move":
      return move(state, command.direction);
    case "craft":
      return craft(state, command.recipeId);
    case "gather":
      return gather(state);
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

  if (!isPassable(terrain, state.craftedItems)) {
    return [{ type: "blocked", at: from, toward: to, terrain }];
  }

  state.player.x = to.x;
  state.player.y = to.y;

  const events: GameEvent[] = [{ type: "moved", from: from, to: to }];
  events.push(...gather(state));
  return events;
}
function gather(state: GameState): GameEvent[] {
  const location = { ...state.player };
  const cellKey = `${location.x},${location.y}`;
  if (state.collectedCells.includes(cellKey)) {
    return [{ type: "not-gathered", at: location }];
  }
  const letter = letterAt(state.seed, location.x, location.y);
  if (letter == null) {
    return [];
  }
  state.collectedCells.push(cellKey);
  state.collectedLetters.push(letter);
  return [{ type: "gathered", at: location, letter: letter }];
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
  if (recipe.id === "winningcat") {
    state.gameOver = true;
    return [{
      type: "crafted",
      recipeId: recipe.id,
      emoji: recipe.emoji,
    }, {
      type: "end",
    }];
  }
  return [{
    type: "crafted",
    recipeId: recipe.id,
    emoji: recipe.emoji,
  }];
}
