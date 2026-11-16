export type Recipe = {
  id: string;
  name: string;
  letters: string;
  emoji: string;
};

export const RECIPES: Recipe[] = [
  { id: "key", name: "Key", letters: "KEY", emoji: "🔑" },
  { id: "map", name: "Map", letters: "MAP", emoji: "🗺️" },
  { id: "axe", name: "Axe", letters: "AXE", emoji: "🪓" },
  { id: "gem", name: "Gem", letters: "GEM", emoji: "💎" },
  { id: "fire", name: "Fire", letters: "FIRE", emoji: "🔥" },
  { id: "boat", name: "Boat", letters: "BOAT", emoji: "🛶" },
  { id: "food", name: "Food", letters: "FOOD", emoji: "🍎" },
  { id: "rope", name: "Rope", letters: "ROPE", emoji: "🪢" },
];
