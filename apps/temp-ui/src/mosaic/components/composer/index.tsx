import { useState } from "react";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { CornerUpLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { composerSlots } from "../../plugins";
import type { Message, Tone } from "../../types";
import { PluginDot } from "../primitives";
import { editorConfig, useLinkEditor, useWriteDraft } from "./editing";
import { Editor, EmptyWatcher, FormatBar, LinkEditor } from "./editor";
import {
  AddressBlock,
  AssistLane,
  AttachButton,
  AttachmentRail,
  DropOverlay,
  SendCluster,
} from "./parts";
import { sampleFile, suggestionDrafts, useDraft, useDropzone, type Draft } from "./state";

type ComposerAction = { label: string; plugin: { tone: Tone } };
type Suggestions = ReturnType<typeof composerSlots>["suggestions"];

/**
 * Closed, the composer is a pill that floats clear of the thread — no rule
 * across the window, nothing pinned to its edges.
 */
function ClosedPill({
  message,
  actions,
  onOpen,
}: {
  message: Message;
  actions: ComposerAction[];
  onOpen: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-2 px-4 pb-4">
      <button
        type="button"
        onClick={onOpen}
        className="flex h-9 w-full max-w-sm min-w-0 items-center gap-2.5 rounded-full bg-background px-3.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_6px_16px_-8px_rgba(0,0,0,0.18)] ring-1 ring-black/5 outline-none transition-shadow hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_10px_24px_-10px_rgba(0,0,0,0.25)] focus-visible:ring-3 focus-visible:ring-ring/50"
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
          onClick={onOpen}
          className="h-9 shrink-0 rounded-full shadow-xs"
        >
          <PluginDot tone={action.plugin.tone} data-icon="inline-start" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}

/**
 * The card itself. It lives inside the Lexical provider because the format
 * buttons and the suggestions both act on the editor, and the row they sit in
 * is part of the card rather than a bar floating over the text.
 */
function OpenCard({
  message,
  draft,
  suggestions,
  onClose,
}: {
  message: Message;
  draft: Draft;
  suggestions: Suggestions;
  onClose: () => void;
}) {
  const [empty, setEmpty] = useState(true);
  const write = useWriteDraft();
  const link = useLinkEditor();
  const { over, dropProps } = useDropzone(draft.attach);

  return (
    <div
      className="flex shrink-0 justify-center px-4 pb-4"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) onClose();
      }}
    >
      <div
        {...dropProps}
        className="relative flex max-h-[60vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-background shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-12px_rgba(0,0,0,0.22)] ring-1 ring-black/5 duration-200 animate-in fade-in slide-in-from-bottom-2"
      >
        {over ? <DropOverlay /> : null}

        {/* Full bleed: the recess runs out to the card's own edge, so the card's
            radius caps it. The change in surface is the only separator it needs. */}
        <div className="shrink-0 bg-muted/60 px-4 py-1">
          <AddressBlock message={message} draft={draft} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-3.5 pb-2">
          <Editor placeholder={`Reply to ${message.from.name.split(" ").at(0)}…`} />
          <AttachmentRail draft={draft} />
        </div>

        <div className="flex shrink-0 items-center gap-2 pr-3 pb-2.5 pl-3">
          <FormatBar onLink={link.start} />

          {/* The row is where contextual controls go, so the link editor takes
              it over instead of floating a popover across the message. */}
          {link.open ? (
            <LinkEditor link={link} />
          ) : (
            <AssistLane
              empty={empty}
              suggestions={suggestions}
              onPick={(label) => {
                const suggestion = suggestionDrafts.get(label);
                if (!suggestion) return;
                write(suggestion.body);
                if (suggestion.attach) draft.attach([suggestion.attach]);
              }}
            />
          )}
          <AttachButton onPick={() => draft.attach([sampleFile])} />
          <SendCluster onClose={onClose} />
        </div>
      </div>

      <AutoFocusPlugin />
      <EmptyWatcher onChange={setEmpty} />
    </div>
  );
}

/**
 * A card that sits on the page rather than a strip welded to the window: its
 * own rounded edge on all four sides, and no hairline running the full width
 * of the app. The addresses cap the top in a recess the card's radius clips,
 * and one row under the body carries everything else, so the height never
 * moves while you write.
 */
export function Composer({
  message,
  open,
  onOpenChange,
}: {
  message: Message;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const draft = useDraft();
  const { suggestions, actions } = composerSlots(message);

  function close() {
    onOpenChange(false);
    draft.reset();
  }

  if (!open) {
    return <ClosedPill message={message} actions={actions} onOpen={() => onOpenChange(true)} />;
  }

  /*
   * The provider is mounted with the card and torn down with it, so closing a
   * draft disposes the editor state — there is nothing to clear by hand.
   */
  return (
    <LexicalComposer initialConfig={editorConfig}>
      <OpenCard message={message} draft={draft} suggestions={suggestions} onClose={close} />
    </LexicalComposer>
  );
}
