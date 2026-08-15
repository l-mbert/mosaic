import { useCallback, useRef, useState } from "react";
import { $isLinkNode, LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $findMatchingParent } from "@lexical/utils";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  type BaseSelection,
} from "lexical";

/** Lexical styles by class name, so the draft renders in the app's own type. */
const theme = {
  paragraph: "mb-2 last:mb-0",
  text: {
    bold: "font-semibold",
    italic: "italic",
    underline: "underline underline-offset-2",
    strikethrough: "line-through",
  },
  link: "text-tone-deal underline underline-offset-2",
  list: {
    ul: "flex list-disc flex-col gap-0.5 pl-5",
    listitem: "pl-0.5",
  },
};

export const editorConfig = {
  namespace: "mosaic-composer",
  theme,
  nodes: [ListNode, ListItemNode, LinkNode],
  onError: (error: Error) => {
    throw error;
  },
};

/** Replaces the draft with a suggestion's text, caret at the end. */
export function useWriteDraft() {
  const [editor] = useLexicalComposerContext();

  return useCallback(
    (text: string) => {
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        for (const line of text.split("\n")) {
          const paragraph = $createParagraphNode();
          if (line) paragraph.append($createTextNode(line));
          root.append(paragraph);
        }
        root.selectEnd();
      });
      editor.focus();
    },
    [editor],
  );
}

/** A bare domain is what people type; the message needs a real URL. */
function withScheme(value: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
}

/**
 * The link editor lives in the row under the body, which means its input takes
 * focus away from the draft and the caret goes with it. So the selection is
 * captured when the editor opens and put back before the command runs — the
 * link lands on the text you had chosen, not wherever the caret drifted to.
 */
export function useLinkEditor() {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [existing, setExisting] = useState(false);
  const [url, setUrl] = useState("");
  const selection = useRef<BaseSelection | null>(null);

  const start = useCallback(() => {
    editor.getEditorState().read(() => {
      const current = $getSelection();
      selection.current = current?.clone() ?? null;

      const node = $isRangeSelection(current) ? current.anchor.getNode() : null;
      const link = node ? $findMatchingParent(node, $isLinkNode) : null;
      setExisting(link !== null);
      setUrl(link?.getURL() ?? "");
    });
    setOpen(true);
  }, [editor]);

  const restore = useCallback(() => {
    editor.update(() => {
      if (selection.current) $setSelection(selection.current.clone());
    });
  }, [editor]);

  const close = useCallback(() => {
    setOpen(false);
    restore();
    editor.focus();
  }, [editor, restore]);

  const apply = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed) return;
    restore();
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, withScheme(trimmed));
    close();
  }, [close, editor, restore, url]);

  const remove = useCallback(() => {
    restore();
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    close();
  }, [close, editor, restore]);

  return { open, existing, url, setUrl, start, apply, remove, cancel: close };
}

export type LinkEditorState = ReturnType<typeof useLinkEditor>;
