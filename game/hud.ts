import {
  type GameEvent,
  type GameState,
  RECIPES,
  terrainAt,
} from "../core/mod.ts";

function element(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function describe(event: GameEvent): string {
  switch (event.type) {
    case "moved":
      return `moved to ${event.to.x}, ${event.to.y}`;
    case "blocked":
      return `blocked by ${event.terrain} at ${event.toward.x}, ${event.toward.y}`;
    case "collected":
      return `collected letter ${event.letter}`;
    case "crafted":
      return `crafted ${event.emoji}`;
    case "craft-failed":
      switch (event.reason) {
        case "unknown-recipe":
          return "unknown recipe";
        case "missing-letters":
          return "not enough letters";
        case "already-owned":
          return "you already own this item";
      }
  }
}

// The readout, as ordinary page elements that CSS can style and that assistive
// tools can read. It changes only as events play.
export class Hud {
  private readonly seed: number;

  constructor(state: GameState) {
    this.seed = state.seed;
    this.showPosition(state.player.x, state.player.y);
    this.showInventory(state);
  }

  show(event: GameEvent) {
    element("live").textContent = describe(event);
    if (event.type === "moved") this.showPosition(event.to.x, event.to.y);
  }

  private showPosition(x: number, y: number) {
    element("position").textContent = `${x}, ${y}`;
    element("terrain").textContent = terrainAt(this.seed, x, y);
  }

  showInventory(state: GameState) {
    const inventory = state.collectedLetters;
    const itemInventory = state.craftedItems;
    const emojiList: string[] = [];
    for (const i of itemInventory) {
      const emoji = RECIPES.find((item) => item.id === i)?.emoji;
      if (emoji) emojiList.push(emoji);
    }
    element("itemInventory").textContent = itemInventory.length > 0
      ? emojiList.join()
      : "Empty";
    element("inventory").textContent = inventory.length > 0
      ? inventory.join(" ")
      : "Empty";
  }
}
