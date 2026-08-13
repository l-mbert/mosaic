export const UTILITY_RESTART_DELAYS_MS = [500, 1_000, 2_000] as const;
export const UTILITY_HEALTHY_RESET_MS = 30_000;

export type UtilityRestartDecision =
  | {
      readonly _tag: "Restart";
      readonly delayMs: number;
      readonly nextAttempt: number;
    }
  | { readonly _tag: "Exhausted" };

export function utilityRestartDecision(attempt: number): UtilityRestartDecision {
  const delayMs = UTILITY_RESTART_DELAYS_MS[attempt];

  return delayMs === undefined
    ? { _tag: "Exhausted" }
    : { _tag: "Restart", delayMs, nextAttempt: attempt + 1 };
}
