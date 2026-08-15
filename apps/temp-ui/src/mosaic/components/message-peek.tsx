import { peekPanel, replacement } from "../plugins";
import type { Message } from "../types";

/**
 * A miniature of the message, shown on hover so a row can be judged without
 * opening it. Deliberately not the reader at a smaller size: it shows whichever
 * panel the plugin already renders, plus three lines of the body, and stops.
 */
export function MessagePeek({ message }: { message: Message }) {
  const standIn = replacement(message);
  const panel = peekPanel(message);

  const firstParagraph = message.body.find((block) => block.type === "paragraph");
  const text = firstParagraph?.spans.map((span) => span.text).join("") ?? "";

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[0.5625rem] font-semibold text-muted-foreground">
          {message.from.initials}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium">{message.from.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{message.time}</span>
      </div>

      <div className="line-clamp-2 text-[0.8125rem] leading-5 font-semibold">{message.subject}</div>

      {/* The plugin's reduced form — no controls, since the card cannot be clicked. */}
      {panel}

      {text && !standIn ? (
        <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">{text}</p>
      ) : null}
    </div>
  );
}
