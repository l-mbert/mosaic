import { ArchiveIcon, ChevronDownIcon, ClockIcon, SearchIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { allPlugins, collect } from "../plugins";
import type { Message, Tab } from "../types";
import { MessagePeek } from "./message-peek";
import { PluginDot } from "./primitives";
import { Sidebar } from "./sidebar";

function MessageRow({
  message,
  highlighted,
  onOpen,
  onHighlight,
}: {
  message: Message;
  highlighted: boolean;
  onOpen: () => void;
  onHighlight: () => void;
}) {
  const badges = collect("listBadge", message);

  return (
    /*
     * The row's hit overlay doubles as the peek trigger, so hovering anywhere on
     * the row raises the preview and clicking anywhere opens the message.
     */
    <HoverCard>
      <div
        onMouseEnter={onHighlight}
        className={cn(
          "group relative isolate flex h-10 items-center gap-3 rounded-lg px-3",
          highlighted ? "bg-black/4" : null,
        )}
      >
        <HoverCardTrigger
          delay={450}
          closeDelay={80}
          render={
            <button
              type="button"
              onClick={onOpen}
              className="absolute inset-0 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
            />
          }
        >
          <span className="sr-only">
            {message.from.name}: {message.subject}
          </span>
        </HoverCardTrigger>

        <span
          aria-hidden
          className={cn(
            "pointer-events-none size-1.5 shrink-0 rounded-full",
            message.unread ? "bg-foreground" : "bg-transparent",
          )}
        />

        <div className="pointer-events-none flex w-40 shrink-0 items-baseline gap-1.5">
          <div
            className={cn(
              "min-w-0 truncate text-[0.8125rem]",
              message.unread ? "font-semibold" : "text-muted-foreground",
            )}
          >
            {message.from.name}
          </div>
          {message.threadCount ? (
            <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {message.threadCount}
            </div>
          ) : null}
        </div>

        <div className="pointer-events-none flex min-w-0 flex-1 items-baseline gap-1.5">
          {message.gist ? (
            <SparklesIcon className="size-3 shrink-0 self-center text-tone-ai" />
          ) : null}
          <div className="min-w-0 flex-1 truncate text-[0.8125rem]">
            <span className={cn(message.unread ? "font-medium" : "text-muted-foreground")}>
              {message.subject}
            </span>
            <span className="text-muted-foreground">
              {" — "}
              {message.gist ?? message.preview}
            </span>
          </div>
        </div>

        {badges.map(({ plugin, node }) => (
          <span key={plugin.id} className="pointer-events-none">
            {node}
          </span>
        ))}

        <div className="pointer-events-none relative flex w-12 shrink-0 justify-end">
          <span className="text-xs text-muted-foreground tabular-nums group-hover:invisible">
            {message.time}
          </span>
          <div className="pointer-events-auto absolute inset-y-0 right-0 hidden items-center gap-0.5 group-hover:flex">
            <Button variant="ghost" size="icon-xs" aria-label="Archive">
              <ArchiveIcon />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label="Snooze until later">
              <ClockIcon />
            </Button>
          </div>
        </div>
      </div>

      <HoverCardContent side="right" align="start" sideOffset={8} className="w-80">
        <MessagePeek message={message} />
      </HoverCardContent>
    </HoverCard>
  );
}

const buckets = [
  { key: "needs-you" as const, label: "Needs you" },
  { key: "everything" as const, label: "Everything" },
];

/**
 * A folder gets the whole page. With the reader living in its own tab, rows have
 * room for sender, subject and preview on one line without any of them fighting.
 */
export function MailPage({
  title,
  activeFolderId,
  messages,
  highlightedId,
  onHighlight,
  onOpen,
  onOpenFolder,
}: {
  title: string;
  activeFolderId: string;
  messages: Message[];
  highlightedId: string;
  onHighlight: (id: string) => void;
  onOpen: (message: Message) => void;
  onOpenFolder: (tab: Tab) => void;
}) {
  const filters = allPlugins.flatMap((plugin) =>
    (plugin.filters ?? []).map((filter) => ({ plugin, filter })),
  );

  return (
    <div className="flex min-h-0 flex-1 justify-center px-10 py-8">
      <div className="flex min-h-0 w-full max-w-page gap-10">
        <Sidebar activeId={activeFolderId} onOpen={onOpenFolder} />

        <ScrollArea className="min-h-0 flex-1">
          <div className="@container flex w-full flex-col gap-8 pb-8">
            <div className="flex flex-col gap-4">
              <InputGroup className="h-10 rounded-xl border-transparent bg-muted">
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput placeholder={`Search in ${title}`} />
                <InputGroupAddon align="inline-end">
                  <Kbd>⌘K</Kbd>
                </InputGroupAddon>
              </InputGroup>

              <div className="flex items-center gap-1">
                {filters.map(({ plugin, filter }) => (
                  <Button key={filter.id} variant="ghost" size="xs" className="shrink-0 gap-1.5">
                    <PluginDot tone={plugin.tone} />
                    {filter.label}
                    {filter.count === undefined ? null : (
                      <span className="text-muted-foreground tabular-nums">{filter.count}</span>
                    )}
                  </Button>
                ))}
                <div className="flex-1" />
                <Button variant="ghost" size="xs" className="shrink-0 text-muted-foreground">
                  Newest
                  <ChevronDownIcon data-icon="inline-end" />
                </Button>
              </div>
            </div>

            {buckets.map((bucket) => {
              const rows = messages.filter((message) => message.bucket === bucket.key);
              if (rows.length === 0) return null;
              return (
                <section key={bucket.key} className="flex flex-col gap-1">
                  <div className="flex h-7 items-center gap-2 px-3">
                    <div className="text-xs font-medium text-muted-foreground">{bucket.label}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">{rows.length}</div>
                  </div>
                  {rows.map((message) => (
                    <MessageRow
                      key={message.id}
                      message={message}
                      highlighted={message.id === highlightedId}
                      onHighlight={() => onHighlight(message.id)}
                      onOpen={() => onOpen(message)}
                    />
                  ))}
                </section>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
