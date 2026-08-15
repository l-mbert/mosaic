import { ChevronDownIcon, FileTextIcon, PaperclipIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Message, Person } from "../../types";
import { PluginDot } from "../primitives";
import type { Draft, Suggestion } from "./state";

export function DropOverlay({ label = "Drop to attach" }: { label?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-background/85 backdrop-blur-[1px] duration-150 animate-in fade-in">
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-foreground/25 px-3.5 py-2.5">
        <PaperclipIcon className="size-3.5 text-muted-foreground" />
        <span className="text-[0.8125rem] font-medium">{label}</span>
      </div>
    </div>
  );
}

function RecipientChip({ person, onRemove }: { person: Person; onRemove?: () => void }) {
  return (
    <span className="group/chip flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-background px-1">
      <span className="flex size-4.5 items-center justify-center rounded-full bg-muted text-[0.5625rem] font-semibold text-muted-foreground">
        {person.initials}
      </span>
      <span className="text-xs">{person.name}</span>
      <Button
        variant="ghost"
        size="icon-xs"
        className="size-4 rounded-full text-muted-foreground opacity-60 transition-opacity hover:bg-muted group-hover/chip:opacity-100"
        aria-label={`Remove ${person.name}`}
        onClick={onRemove}
      >
        <XIcon />
      </Button>
    </span>
  );
}

/** One labelled line of the address block. Labels share a gutter so values align. */
function Row({
  label,
  children,
  action,
}: {
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-8 items-center gap-2">
      <span className="w-12 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 py-1">{children}</div>
      {action ? <div className="flex shrink-0 items-center gap-0.5">{action}</div> : null}
    </div>
  );
}

function AddressInput({ placeholder }: { placeholder: string }) {
  return (
    <input
      placeholder={placeholder}
      aria-label={placeholder}
      className="h-6 min-w-32 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
    />
  );
}

function Toggle({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="xs"
      className="text-muted-foreground hover:bg-background/70"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function HideRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      className="text-muted-foreground hover:bg-background/70"
      aria-label={`Hide ${label}`}
      onClick={onClick}
    >
      <XIcon />
    </Button>
  );
}

/**
 * To, Cc, Bcc and Subject each get their own line, with the labels in a shared
 * gutter so the values line up. Cc and Bcc stay behind their own toggle, so the
 * block is two lines tall until you ask for more.
 *
 * It sits on the recessed cap, which is why the chips are the light ones.
 */
export function AddressBlock({ message, draft }: { message: Message; draft: Draft }) {
  const others = message.to.filter((person) => person.initials !== "LW");

  return (
    <div className="flex flex-col">
      <Row
        label="To"
        action={
          <>
            {draft.cc ? null : <Toggle label="Cc" onClick={() => draft.setCc(true)} />}
            {draft.bcc ? null : <Toggle label="Bcc" onClick={() => draft.setBcc(true)} />}
          </>
        }
      >
        <RecipientChip person={message.from} />
        {others.map((person) => (
          <RecipientChip key={person.email} person={person} />
        ))}
        <AddressInput placeholder="Add people" />
      </Row>

      {draft.cc ? (
        <Row label="Cc" action={<HideRow label="Cc" onClick={() => draft.setCc(false)} />}>
          <AddressInput placeholder="Add people" />
        </Row>
      ) : null}

      {draft.bcc ? (
        <Row label="Bcc" action={<HideRow label="Bcc" onClick={() => draft.setBcc(false)} />}>
          <AddressInput placeholder="Hidden from everyone else" />
        </Row>
      ) : null}

      <Row label="Subject">
        <input
          defaultValue={
            message.subject.startsWith("Re:") ? message.subject : `Re: ${message.subject}`
          }
          aria-label="Subject"
          className="h-6 min-w-0 flex-1 bg-transparent text-[0.8125rem] font-medium outline-none"
        />
      </Row>
    </div>
  );
}

/**
 * The one row under the body. It never changes height, so the suggestions
 * leaving as you type cannot move the box out from under the cursor, and
 * nothing it shows ever covers the message.
 *
 * slot: composerSuggestions — offered only while the draft is empty.
 */
export function AssistLane({
  empty,
  suggestions,
  onPick,
}: {
  empty: boolean;
  suggestions: Suggestion[];
  onPick: (label: string) => void;
}) {
  return (
    <div className="relative h-7 min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]">
      <div
        inert={!empty}
        className={cn(
          "absolute inset-y-0 left-0 flex items-center gap-1.5 transition duration-200 ease-out motion-reduce:transition-none",
          empty ? null : "-translate-y-0.5 opacity-0",
        )}
      >
        {suggestions.map(({ plugin, label }) => (
          <Button
            key={label}
            variant="outline"
            size="xs"
            className="rounded-full"
            onClick={() => onPick(label)}
          >
            <PluginDot tone={plugin.tone} data-icon="inline-start" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function AttachmentRail({ draft }: { draft: Draft }) {
  if (draft.attachments.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {draft.attachments.map((file) => (
        <span
          key={file.name}
          className="flex h-8 w-full items-center gap-2 rounded-lg bg-background pr-1 pl-2.5 ring-1 ring-black/5"
        >
          <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate text-xs font-medium">{file.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{file.size}</span>
          {file.note ? (
            <span className="shrink-0 text-xs text-muted-foreground">{file.note}</span>
          ) : null}
          <span className="flex-1" />
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground"
            aria-label={`Remove ${file.name}`}
            onClick={() => draft.detach(file.name)}
          >
            <XIcon />
          </Button>
        </span>
      ))}
    </div>
  );
}

export function AttachButton({ onPick }: { onPick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground"
      aria-label="Attach a file"
      onClick={onPick}
    >
      <PaperclipIcon />
    </Button>
  );
}

/**
 * No seam through the primary and no shortcut chip riding along inside it —
 * the button says the one word it does.
 */
export function SendCluster({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onClose}>
        Discard
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label="Send options"
            >
              <ChevronDownIcon />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuItem>Send and archive</DropdownMenuItem>
            <DropdownMenuItem>Send later…</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>Remind me if no reply</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="sm" className="ml-1 px-3.5" onClick={onClose}>
        Send
      </Button>
    </div>
  );
}
