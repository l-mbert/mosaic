import { useEffect, useRef, useState } from "react";
import { $isLinkNode } from "@lexical/link";
import {
  $isListNode,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { $findMatchingParent, mergeRegister } from "@lexical/utils";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { BoldIcon, ItalicIcon, LinkIcon, ListIcon, type LucideIcon } from "lucide-react";

import type { LinkEditorState } from "./editing";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Editor({ placeholder }: { placeholder: string }) {
  return (
    <div className="relative min-w-0">
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            aria-label="Message body"
            aria-placeholder={placeholder}
            placeholder={
              <div className="pointer-events-none absolute inset-x-0 top-0 text-[0.9375rem]/6 text-muted-foreground">
                {placeholder}
              </div>
            }
            className="max-w-(--container-measure) min-h-24 text-[0.9375rem]/6 outline-none"
          />
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin />
    </div>
  );
}

/** Reports whether the draft has any text yet, for the suggestion lane. */
export function EmptyWatcher({ onChange }: { onChange: (empty: boolean) => void }) {
  return (
    <OnChangePlugin
      ignoreSelectionChange
      onChange={(state) =>
        state.read(() => onChange($getRoot().getTextContent().trim().length === 0))
      }
    />
  );
}

/**
 * Which marks are live where the caret is. Lexical answers the same question
 * whether text is selected or the caret is empty with a pending format, so the
 * buttons read as toggles in both cases without us tracking two states.
 */
function useActiveMarks() {
  const [editor] = useLexicalComposerContext();
  const [marks, setMarks] = useState({ bold: false, italic: false, link: false, list: false });

  useEffect(() => {
    function read() {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const node = selection.anchor.getNode();
      setMarks({
        bold: selection.hasFormat("bold"),
        italic: selection.hasFormat("italic"),
        link: $findMatchingParent(node, $isLinkNode) !== null,
        list: $findMatchingParent(node, $isListNode) !== null,
      });
    }

    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => editorState.read(read)),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          read();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor]);

  return marks;
}

function Mark({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      className={cn("text-muted-foreground", active ? "bg-muted text-foreground" : null)}
      onClick={onClick}
    >
      <Icon />
    </Button>
  );
}

/**
 * Always on the row, never over the text. With a selection each button applies
 * to it; with an empty caret it arms the mark for whatever you type next —
 * which is Lexical's own behaviour for `FORMAT_TEXT_COMMAND`, not something
 * layered on top of it.
 */
export function FormatBar({ onLink }: { onLink: () => void }) {
  const [editor] = useLexicalComposerContext();
  const marks = useActiveMarks();

  return (
    // Pressing a button must not cost the selection it is about to act on.
    <div
      className="flex shrink-0 items-center gap-0.5"
      onMouseDown={(event) => event.preventDefault()}
    >
      <Mark
        label="Bold"
        icon={BoldIcon}
        active={marks.bold}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      />
      <Mark
        label="Italic"
        icon={ItalicIcon}
        active={marks.italic}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      />
      <Mark
        label="Link"
        icon={LinkIcon}
        active={marks.link}
        onClick={onLink}
      />
      <Mark
        label="Bulleted list"
        icon={ListIcon}
        active={marks.list}
        onClick={() =>
          marks.list
            ? editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
            : editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        }
      />
    </div>
  );
}

/**
 * The link editor takes over the row rather than floating over the message,
 * the same way every other contextual control in this composer does. Escape
 * and Enter are stopped here so they land on the link and not on the card,
 * which would otherwise discard or send the draft.
 */
export function LinkEditor({ link }: { link: LinkEditorState }) {
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.select(), []);

  return (
    <div className="flex h-7 min-w-0 flex-1 items-center gap-1.5">
      <LinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
      <input
        ref={input}
        value={link.url}
        onChange={(event) => link.setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          if (event.key === "Enter") link.apply();
          else link.cancel();
        }}
        placeholder="Paste or type a link"
        aria-label="Link address"
        className="h-6 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
      />
      {link.existing ? (
        <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={link.remove}>
          Remove
        </Button>
      ) : null}
      <Button variant="outline" size="xs" disabled={link.url.trim() === ""} onClick={link.apply}>
        Apply
      </Button>
    </div>
  );
}
