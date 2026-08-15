import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { HoverCard, HoverCardContent } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { MessagePeek } from "./message-peek";
import type { Peek } from "./use-peek";

interface PeekStyle extends CSSProperties {
  "--peek-width": string;
}

export function PeekCard({ peek, onClose }: { peek: Peek | null; onClose: () => void }) {
  const pinned = peek?.anchor.kind === "element" ? peek.anchor : null;
  const pinnedStyle: PeekStyle | undefined = pinned
    ? { "--peek-width": `${pinned.width}px` }
    : undefined;
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const open = peek !== null;

  // Re-seed from whatever opened it, so the card never flashes at 0,0.
  useEffect(() => {
    if (peek?.anchor.kind === "pointer") setPoint({ x: peek.anchor.x, y: peek.anchor.y });
  }, [peek]);

  useEffect(() => {
    if (!open || pinned) return;
    let frame = 0;
    function onMove(event: MouseEvent) {
      cancelAnimationFrame(frame);
      const { clientX, clientY } = event;
      frame = requestAnimationFrame(() => setPoint({ x: clientX, y: clientY }));
    }
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [open, pinned]);

  /*
   * For a row, a zero-size rect at the pointer. Its identity changes with the
   * pointer, which is what makes the positioner recompute — `trackAnchor`
   * watches real elements and would never notice a virtual one moving. For a
   * tab, the tab element itself, so the card holds still beneath it.
   */
  const anchor = useMemo(() => {
    if (peek?.anchor.kind === "element") return peek.anchor.element;
    return { getBoundingClientRect: () => new DOMRect(point.x, point.y, 0, 0) };
  }, [peek, point]);

  if (!peek) return null;

  return (
    <HoverCard open={open} onOpenChange={(next) => !next && onClose()}>
      <HoverCardContent
        anchor={anchor}
        /*
         * Below-right of the pointer, like a drag ghost. Anchoring to the side
         * made the card flip left the moment the pointer neared the right edge,
         * so it lurched sideways while you were moving right. A tab's card sits
         * squarely beneath the tab instead, flush with its left edge.
         */
        side="bottom"
        align="start"
        sideOffset={pinned ? 6 : 18}
        alignOffset={pinned ? 0 : 14}
        /*
         * The card can sit under the pointer, so it must not take pointer
         * events: it would otherwise steal the hover from whatever opened it
         * and fight itself. That makes the peek strictly non-interactive.
         *
         * Pinned under a tab it takes the tab's own width, so the two read as
         * one object rather than a wide card hanging off a narrow tab.
         */
        style={pinnedStyle}
        className={cn("pointer-events-none", pinned ? "w-(--peek-width)" : "w-80")}
      >
        <MessagePeek message={peek.message} />
      </HoverCardContent>
    </HoverCard>
  );
}
