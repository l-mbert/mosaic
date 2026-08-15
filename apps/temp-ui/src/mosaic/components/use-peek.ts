import { useCallback, useEffect, useRef, useState } from "react";

import type { Message } from "../types";

/** How long the pointer must rest before the first card appears. */
const OPEN_DELAY = 450;
/** After a card closes, further peeks open instantly for this long. */
const WARM_WINDOW = 1000;

/**
 * A row's card tracks the pointer; a tab's card is pinned under the tab. The
 * anchor decides which, so both share one card and one delay.
 */
export type PeekAnchor =
  | { kind: "pointer"; x: number; y: number }
  /** `width` is measured when the peek opens, so the card can match the tab. */
  | { kind: "element"; element: HTMLElement; width: number };

export interface Peek {
  message: Message;
  anchor: PeekAnchor;
}

/**
 * One card for the whole window, driven imperatively rather than by a trigger
 * per row. Two behaviours come from that:
 *
 * - Moving between rows never closes and reopens the card, so it does not
 *   flicker; only leaving the list closes it.
 * - The delay is shared across rows and tabs. The first card costs a beat;
 *   while the group is warm the next one is instant. Base UI groups delays for
 *   tooltips but not for preview cards, so the policy lives here.
 */
export function usePeek() {
  const [peek, setPeek] = useState<Peek | null>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const warmUntil = useRef(0);
  const showing = useRef(false);

  showing.current = peek !== null;

  useEffect(() => () => window.clearTimeout(openTimer.current), []);

  const enter = useCallback((message: Message, anchor: PeekAnchor) => {
    window.clearTimeout(openTimer.current);

    if (Date.now() < warmUntil.current || showing.current) {
      setPeek({ message, anchor });
      return;
    }
    openTimer.current = window.setTimeout(() => setPeek({ message, anchor }), OPEN_DELAY);
  }, []);

  const leave = useCallback(() => {
    window.clearTimeout(openTimer.current);
    // Only a card that actually appeared keeps the group warm. Passing over a
    // row too quickly to open anything should not shortcut the next one.
    if (showing.current) warmUntil.current = Date.now() + WARM_WINDOW;
    setPeek(null);
  }, []);

  return { peek, enter, leave };
}
