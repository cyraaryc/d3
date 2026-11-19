# Manual test script

For a person, or an agent driving a browser. Run `deno task dev` and open the local URL with `?seed=121`. Before each section, reload. To read logical state, use `game.state` in the console. To read what has played, use the panel beside the grid, including the `#live` text, or look at the marker.

**Promotion rule:** When crafting, it was found that you could craft the same thing twice. The code block here passes the test that checks that you can't craft the same item twice.

```
if (state.craftedItems.includes(recipe.id)) {
    return [{
      type: "craft-failed",
      recipeId,
      reason: "already-owned",
    }];
  }
Deno.test("an already owned item cannot be crafted again", () => {
  const state: GameState = {
    seed: SEED,
    player: { x: 0, y: 0 },
    collectedCells: [],
    collectedLetters: ["F", "O", "O", "D"],
    craftedItems: ["food"],
  };
```

| # | Action                                                                 | Expected observation                                                 |
| - | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1 | Crafting an item works                                                 | When crafting an item gets crafted                                   |
| 2 | Crafting out of order                                                  | Crafting works even when out of order                                |
| 3 | Crafting without letters in the inventory                              | Crafting fails                                                       |
| 4 | terrian blocks player movement unless they have items (multiple tests) | Unless the player has an item you can't cross the asscoiated terrian |

|
