import type { ReactNode } from "react";
import {
  ArrowUpRightIcon,
  CalendarIcon,
  FileSignatureIcon,
  HandshakeIcon,
  InboxIcon,
  LayersIcon,
  PlaneIcon,
  SparklesIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { timeline } from "./data";
import type { Message, Plugin, PluginId } from "./types";
import { Fact, Panel, PluginDot, SectionRule } from "./components/primitives";
import { DealFolder, NewslettersFolder } from "./components/folder-canvas";

/* ------------------------------------------------------------------ core -- */

const core: Plugin = {
  id: "core",
  name: "Mail",
  tone: "neutral",
  icon: InboxIcon,
  section: "Mail",
  folders: [
    { id: "inbox", label: "Inbox", count: 4 },
    { id: "later", label: "Later", count: 3 },
    { id: "sent", label: "Sent" },
    { id: "archive", label: "Archive" },
  ],
};

/* ------------------------------------------------------------- deal desk -- */

const dealDesk: Plugin = {
  id: "deal-desk",
  name: "Deal Desk",
  tone: "deal",
  icon: HandshakeIcon,
  section: "Deals",
  folders: [
    { id: "deal-acme", label: "Acme Inc · Renewal", count: 9, canvas: true, mark: "A" },
    { id: "deal-northwind", label: "Northwind · Pilot", count: 4, canvas: true, mark: "N" },
    { id: "deal-vertex", label: "Vertex · Expansion", count: 2, canvas: true, mark: "V" },
  ],
  filters: [
    { id: "deals", label: "Deals", count: 11 },
    { id: "quotes", label: "Quotes sent", count: 3 },
  ],

  listBadge: (message) =>
    message.deal ? (
      <span
        className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"
        aria-label={message.deal.account}
      >
        <PluginDot tone="deal" />
        <span className="hidden @md:inline">{message.deal.account}</span>
      </span>
    ) : null,

  readerAbove: (message) =>
    message.deal ? (
      <section className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl px-3 py-2 ring-1 ring-black/5">
        <button
          type="button"
          className="flex shrink-0 items-center gap-2 rounded outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-tone-deal text-[0.5625rem] font-semibold text-white">
            {message.deal.account.at(0)}
          </span>
          <span className="text-[0.8125rem] font-semibold">{message.deal.account}</span>
          <ArrowUpRightIcon className="size-3 shrink-0 text-muted-foreground" />
        </button>
        <Badge variant="outline" className="shrink-0 text-tone-attention">
          {message.deal.stage}
        </Badge>
        <div className="flex shrink-0 items-center gap-x-3">
          <Fact label="Value" value={message.deal.value} />
          <Fact label="Close" value={message.deal.closeDate} />
        </div>
      </section>
    ) : null,

  readerBelow: (message) =>
    message.deal ? (
      <section className="flex flex-col gap-0.5">
        <SectionRule label="Earlier in this deal" meta={`${timeline.length} of 14`} />
        <ul role="list" className="flex flex-col pt-1">
          {timeline.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex h-7 w-full items-center gap-2.5 rounded-md px-1.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <PluginDot tone={registry[item.plugin].tone} />
                <div className="min-w-0 shrink truncate text-[0.8125rem]">{item.title}</div>
                <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {item.meta}
                </div>
                <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {item.time}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>
    ) : null,

  composerActions: (message) =>
    message.deal ? [{ label: "Attach revised quote", primary: true }] : null,

  folderCanvas: (folderId) => (folderId === "deal-acme" ? <DealFolder /> : null),
};

/* -------------------------------------------------------------- esign ----- */

const esign: Plugin = {
  id: "esign",
  name: "Signatures",
  tone: "esign",
  icon: FileSignatureIcon,
  section: "Signatures",
  folders: [{ id: "awaiting-signature", label: "Awaiting signature", count: 2 }],

  listBadge: (message) =>
    message.envelope ? (
      <span
        className="flex shrink-0 items-center gap-0.5"
        aria-label={`${message.envelope.signed} of ${message.envelope.total} signed`}
      >
        {Array.from({ length: message.envelope.total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 w-3 rounded-full",
              i < message.envelope!.signed ? "bg-tone-esign" : "bg-border",
            )}
          />
        ))}
      </span>
    ) : null,

  // The mail body is boilerplate, so this stands in for it entirely.
  readerReplace: (message) =>
    message.envelope ? (
      <Panel
        className="flex-col items-stretch gap-2.5 py-3"
        footer={
          <>
            <PluginDot tone="esign" />
            <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              Waiting on {message.envelope.waitingOn}
            </div>
            <Button variant="outline" size="xs">
              Send a reminder
            </Button>
          </>
        }
      >
        {/* No document title: the subject above it already says the name. */}
        <div className="flex w-full flex-col gap-2.5">
          <ul role="list" className="flex flex-col gap-1.5">
            {message.envelope.parties.map((party) => (
              <li key={party.name} className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    party.signed ? "bg-tone-esign" : "bg-border",
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-[0.8125rem]">{party.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {party.signed ? "Signed" : "Not signed"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>
    ) : null,
};

/* ------------------------------------------------------------- calendar --- */

const calendar: Plugin = {
  id: "calendar",
  name: "Calendar",
  tone: "neutral",
  icon: CalendarIcon,

  listBadge: (message) =>
    message.invite ? (
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {message.invite.when}
      </span>
    ) : null,

  readerReplace: (message) =>
    message.invite ? (
      <Panel>
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 text-[0.8125rem]">
          {message.invite.when} · {message.invite.duration} · {message.invite.guests} guests
        </div>
        <Button variant="outline" size="xs">
          Decline
        </Button>
        <Button size="xs">Accept</Button>
      </Panel>
    ) : null,
};

/* ---------------------------------------------------------------- travel -- */

const travel: Plugin = {
  id: "travel",
  name: "Travel",
  tone: "neutral",
  icon: PlaneIcon,

  listBadge: (message) =>
    message.trip ? (
      <span className="shrink-0 text-xs text-muted-foreground">{message.trip.route}</span>
    ) : null,

  // Above, not instead: the airline's mail still has the fare rules in it.
  readerAbove: (message) =>
    message.trip ? (
      <section className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl px-3 py-2 ring-1 ring-black/5">
        <div className="flex shrink-0 items-center gap-2">
          <PlaneIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-[0.8125rem] font-semibold">{message.trip.route}</span>
        </div>
        <div className="flex shrink-0 items-center gap-x-3">
          <Fact label="Departs" value={message.trip.depart} />
          <Fact label="Flight" value={message.trip.flight} />
          <Fact label="Seat" value={message.trip.seat} />
        </div>
        <Button variant="outline" size="xs" className="shrink-0">
          Add to calendar
        </Button>
      </section>
    ) : null,
};

/* ---------------------------------------------------------------- digest -- */

const digest: Plugin = {
  id: "digest",
  name: "Digest",
  tone: "neutral",
  icon: LayersIcon,
  section: "Bundles",
  folders: [{ id: "newsletters", label: "Newsletters", count: 22, canvas: true }],

  listBadge: (message) =>
    message.digest ? (
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {message.digest.count} bundled
      </span>
    ) : null,

  folderCanvas: (folderId) => (folderId === "newsletters" ? <NewslettersFolder /> : null),

  readerReplace: (message) =>
    message.digest ? (
      <div className="flex max-w-(--container-measure) flex-col">
        {message.digest.items.map((item) => (
          <button
            key={item.title}
            type="button"
            className="flex h-8 items-center gap-3 rounded-md px-1.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">
              {item.source}
            </span>
            <span className="min-w-0 flex-1 truncate text-[0.8125rem]">{item.title}</span>
          </button>
        ))}
        <div className="px-1.5 pt-2 text-xs text-muted-foreground">
          and {message.digest.count - message.digest.items.length} more
        </div>
      </div>
    ) : null,
};

/* ------------------------------------------------------------- assistant -- */

const assistant: Plugin = {
  id: "assistant",
  name: "Assistant",
  tone: "ai",
  icon: SparklesIcon,

  // The assistant holds no privileged slot. It fills the same two any plugin can.
  listBadge: () => null,

  composerSuggestions: (message) =>
    message.deal
      ? ["Send revised quote", "Confirm 24-month term", "Ask about the board date"]
      : message.threadCount
        ? ["Reply with the SOC 2 report", "Ask for a deadline"]
        : null,
};

/* -------------------------------------------------------------- registry -- */

export const registry: Record<PluginId, Plugin> = {
  core,
  "deal-desk": dealDesk,
  esign,
  calendar,
  travel,
  digest,
  assistant,
};

export const allPlugins = Object.values(registry);

/** Everything a slot yields for a message, tagged with who produced it. */
export function collect(
  slot: "readerAbove" | "readerBelow" | "listBadge",
  message: Message,
): { plugin: Plugin; node: ReactNode }[] {
  return allPlugins.flatMap((plugin) => {
    const node = plugin[slot]?.(message);
    return node ? [{ plugin, node }] : [];
  });
}

/** Only one plugin may stand in for the mail body — first one wins. */
export function replacement(message: Message) {
  for (const plugin of allPlugins) {
    const node = plugin.readerReplace?.(message);
    if (node) return { plugin, node };
  }
  return null;
}

/** Which plugins touched this message, for attribution in the reader header. */
export function contributors(message: Message): Plugin[] {
  return allPlugins.filter(
    (plugin) =>
      plugin.readerAbove?.(message) ??
      plugin.readerReplace?.(message) ??
      plugin.readerBelow?.(message),
  );
}

export function composerSlots(message: Message) {
  return {
    suggestions: allPlugins.flatMap((plugin) => {
      const items = plugin.composerSuggestions?.(message);
      return items ? items.map((label) => ({ plugin, label })) : [];
    }),
    actions: allPlugins.flatMap((plugin) => {
      const items = plugin.composerActions?.(message);
      return items ? items.map((action) => ({ plugin, ...action })) : [];
    }),
  };
}
