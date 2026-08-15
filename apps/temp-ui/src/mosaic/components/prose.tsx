import { useState } from "react";
import { MoreHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { registry } from "../plugins";
import type { Block, Entity, Span } from "../types";
import { PluginDot } from "./primitives";

/**
 * A recognised fragment. It uses a popover rather than a tooltip on purpose —
 * the surface carries an action, and a tooltip cannot hold interactive content.
 */
function EntitySpan({ text, entity }: { text: string; entity: Entity }) {
  return (
    <Popover>
      {/* nativeButton={false}: an entity is a fragment of a sentence, so it has
          to stay an inline span rather than become a button inside a paragraph. */}
      <PopoverTrigger nativeButton={false} render={<span className="entity">{text}</span>} />
      <PopoverContent align="start" className="w-64">
        <PopoverHeader>
          <PopoverTitle className="flex items-center gap-1.5 text-xs">
            <PluginDot tone={registry[entity.plugin].tone} />
            {registry[entity.plugin].name}
          </PopoverTitle>
          <PopoverDescription className="text-xs">{entity.label}</PopoverDescription>
        </PopoverHeader>
        <Button variant="outline" size="sm" className="w-full">
          {entity.action}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((span, i) =>
        span.entity ? (
          <EntitySpan key={i} text={span.text} entity={span.entity} />
        ) : (
          <span key={i}>{span.text}</span>
        ),
      )}
    </>
  );
}

/**
 * Message prose. Constrained measure, open leading — a message is something you
 * read, not a data row.
 */
export function MessageBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex max-w-(--container-measure) flex-col gap-3">
      {blocks.map((block, i) => (
        <p
          key={i}
          className={cn(
            "text-pretty text-[0.9375rem]/6",
            // A sign-off is not content — it reads a step back from the message.
            block.type === "signoff" ? "text-muted-foreground" : "text-foreground/85",
          )}
        >
          <Spans spans={block.spans} />
        </p>
      ))}
    </div>
  );
}

/**
 * Quoted history, folded away by default. Almost every mail client leaves this
 * expanded and lets it swamp the reply above it.
 */
export function QuotedBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        variant="secondary"
        size="icon-xs"
        aria-label="Show quoted text"
        onClick={() => setOpen(true)}
      >
        <MoreHorizontalIcon />
      </Button>
    );
  }

  return (
    <div className="flex max-w-(--container-measure) flex-col gap-2 border-l-2 border-border pl-4">
      {text.split("\n\n").map((paragraph, i) => (
        <p key={i} className="text-sm/6 whitespace-pre-line text-muted-foreground">
          {paragraph}
        </p>
      ))}
      <div>
        <Button variant="ghost" size="xs" onClick={() => setOpen(false)}>
          Hide quoted text
        </Button>
      </div>
    </div>
  );
}
