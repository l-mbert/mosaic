import { useEffect, useRef, useState } from "react";
import {
  BoldIcon,
  ChevronDownIcon,
  CornerUpLeftIcon,
  FileTextIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  PaperclipIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { composerSlots } from "../plugins";
import type { Message, Person } from "../types";
import { PluginDot } from "./primitives";

const drafts: Record<string, string> = {
  "Send revised quote":
    "Hi Dana,\n\nRevised quote attached — 140 seats, rate locked for 24 months. Everything else is unchanged from v2.\n\nLambert",
  "Confirm 24-month term":
    "Hi Dana,\n\nConfirmed — we can hold the rate for 24 months. I'll get that reflected in the paperwork.\n\nLambert",
  "Ask about the board date":
    "Hi Dana,\n\nBefore I revise the quote — is the board meeting still the 28th?\n\nLambert",
};

function RecipientChip({ person }: { person: Person }) {
  return (
    <span className="flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-muted px-1">
      <span className="flex size-4.5 items-center justify-center rounded-full bg-background text-[0.5625rem] font-semibold text-muted-foreground ring-1 ring-black/5">
        {person.initials}
      </span>
      <span className="text-xs">{person.name}</span>
      <Button
        variant="ghost"
        size="icon-xs"
        className="size-4 rounded-full"
        aria-label={`Remove ${person.name}`}
      >
        <XIcon />
      </Button>
    </span>
  );
}

export function Composer({
  message,
  open,
  onOpenChange,
}: {
  message: Message;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const [attached, setAttached] = useState<string | null>(null);
  const [showCc, setShowCc] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const { suggestions, actions } = composerSlots(message);

  useEffect(() => {
    if (open) bodyRef.current?.focus();
  }, [open]);

  function close() {
    onOpenChange(false);
    setValue("");
    setAttached(null);
    setShowCc(false);
  }

  if (!open) {
    return (
      <div className="shrink-0 border-t border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-8 py-3">
          <button
            type="button"
            onClick={() => onOpenChange(true)}
            className="flex h-8 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 text-left ring-1 ring-black/5 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <CornerUpLeftIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-muted-foreground">
              Reply to {message.from.name.split(" ").at(0)}
            </span>
            <Kbd className="shrink-0">R</Kbd>
          </button>

          {/* slot: composerActions — buttons a plugin adds beside Reply. */}
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(true)}
              className="shrink-0"
            >
              <PluginDot tone={action.plugin.tone} data-icon="inline-start" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  const empty = value.trim() === "";

  return (
    <div
      className="flex max-h-[60%] shrink-0 flex-col rounded-t-2xl bg-background shadow-[0_-1px_2px_rgba(0,0,0,0.04),0_-12px_32px_rgba(0,0,0,0.06)] ring-1 ring-black/5"
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) close();
      }}
    >
      <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-wrap items-center gap-1.5 px-8 pt-2.5 pb-2">
        <span className="shrink-0 text-xs text-muted-foreground">To</span>
        <RecipientChip person={message.from} />
        {message.to
          .filter((person) => person.initials !== "LW")
          .map((person) => (
            <RecipientChip key={person.email} person={person} />
          ))}
        {showCc ? (
          <>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <span className="shrink-0 text-xs text-muted-foreground">Cc</span>
            <span className="text-xs text-muted-foreground">finance@acme.com</span>
          </>
        ) : (
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={() => setShowCc(true)}
          >
            Cc
          </Button>
        )}
        <div className="flex-1" />
        <div className="shrink-0 truncate text-xs text-muted-foreground">
          {message.subject.startsWith("Re:") ? message.subject : `Re: ${message.subject}`}
        </div>
      </div>

      <Separator />

      <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-8 py-3">
        <Textarea
          ref={bodyRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={`Reply to ${message.from.name.split(" ").at(0)}…`}
          aria-label="Message body"
          className="max-w-(--container-measure) min-h-20 resize-none border-0 bg-transparent p-0 text-[0.9375rem]/6 shadow-none field-sizing-content focus-visible:ring-0"
        />

        {/* slot: composerSuggestions — offered only while the draft is empty,
            so they leave the moment you start writing. */}
        {empty && suggestions.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {suggestions.map(({ plugin, label }) => (
              <Button
                key={label}
                variant="outline"
                size="xs"
                className="rounded-full"
                onClick={() => {
                  setValue(drafts[label] ?? "");
                  if (label === "Send revised quote") setAttached("Acme_Renewal_Quote_v3.pdf");
                  bodyRef.current?.focus();
                }}
              >
                <PluginDot tone={plugin.tone} data-icon="inline-start" />
                {label}
              </Button>
            ))}
          </div>
        ) : null}

        {attached ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-7 shrink-0 items-center gap-2 rounded-lg pr-1 pl-2 ring-1 ring-black/5">
              <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-xs font-medium">{attached}</span>
              <span className="text-xs text-muted-foreground">140 seats</span>
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-5"
                aria-label="Remove attachment"
                onClick={() => setAttached(null)}
              >
                <XIcon />
              </Button>
            </span>
            <span className="text-xs text-muted-foreground">regenerated by Deal Desk</span>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-1 px-7 py-2">
          <Button variant="ghost" size="icon-sm" aria-label="Bold">
            <BoldIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Italic">
            <ItalicIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Link">
            <LinkIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Bulleted list">
            <ListIcon />
          </Button>
          <Separator orientation="vertical" className="mx-1.5 h-5" />
          <Button variant="ghost" size="icon-sm" aria-label="Attach a file">
            <PaperclipIcon />
          </Button>

          <div className="flex-1" />

          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={close}>
            Discard
            <Kbd data-icon="inline-end">Esc</Kbd>
          </Button>
          <ButtonGroup>
            <Button size="sm" onClick={close}>
              Send
              <Kbd data-icon="inline-end" className="bg-background/20 text-background">
                ⌘↵
              </Kbd>
            </Button>
            <ButtonGroupSeparator />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button size="icon-sm" aria-label="Send options">
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
          </ButtonGroup>
        </div>
      </div>
    </div>
  );
}
