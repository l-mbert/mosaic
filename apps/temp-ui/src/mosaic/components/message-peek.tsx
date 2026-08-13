import { PaperclipIcon } from "lucide-react";

import { collect, contributors, replacement } from "../plugins";
import type { Message } from "../types";
import { PluginDot } from "./primitives";

/**
 * A miniature of the message, shown on hover so a row can be judged without
 * opening it. Deliberately not the reader at a smaller size: it shows whichever
 * panel the plugin already renders, plus three lines of the body, and stops.
 */
export function MessagePeek({ message }: { message: Message }) {
  const standIn = replacement(message);
  const above = collect("readerAbove", message);
  const panel = standIn?.node ?? above[0]?.node ?? null;
  const credits = contributors(message);

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

      {/* The plugin's own panel, at whatever width the card gives it. */}
      {panel}

      {text && !standIn ? (
        <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">{text}</p>
      ) : null}

      <div className="flex items-center gap-2 border-t border-border pt-2">
        {message.attachments?.length ? (
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <PaperclipIcon className="size-3" />
            {message.attachments.length}
          </span>
        ) : null}
        <div className="flex-1" />
        {credits.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <PluginDot tone={credits[0].tone} />
            <span className="text-xs text-muted-foreground">{credits[0].name}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Plain mail</span>
        )}
      </div>
    </div>
  );
}
