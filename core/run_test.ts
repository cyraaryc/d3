import { assertEquals } from "@std/assert";
import { apply, type Command, newGame } from "./mod.ts";
import testRun from "./testRun.json" with { type: "json" };

Deno.test("recorded run wins the game", () => {
  const state = newGame(testRun.seed);
  for (const cmd of testRun.commands as Command[]) {
    apply(state, cmd);
  }
  assertEquals(state.gameOver, true);
});
