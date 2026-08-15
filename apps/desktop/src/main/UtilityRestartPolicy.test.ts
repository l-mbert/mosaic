import { assert, describe, it } from "@effect/vitest";

import { UTILITY_HEALTHY_RESET_MS, utilityRestartDecision } from "./UtilityRestartPolicy.ts";

describe("utility restart policy", () => {
  it("uses three bounded exponential backoffs", () => {
    assert.deepStrictEqual(utilityRestartDecision(0), {
      _tag: "Restart",
      delayMs: 500,
      nextAttempt: 1,
    });
    assert.deepStrictEqual(utilityRestartDecision(1), {
      _tag: "Restart",
      delayMs: 1_000,
      nextAttempt: 2,
    });
    assert.deepStrictEqual(utilityRestartDecision(2), {
      _tag: "Restart",
      delayMs: 2_000,
      nextAttempt: 3,
    });
    assert.deepStrictEqual(utilityRestartDecision(3), {
      _tag: "Exhausted",
    });
  });

  it("resets only after a sustained healthy run", () => {
    assert.strictEqual(UTILITY_HEALTHY_RESET_MS, 30_000);
  });
});
