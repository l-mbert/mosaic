import { useEffect, useState } from "react";

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Composer } from "./components/composer";
import { MailPage } from "./components/mail-page";
import { PeekCard } from "./components/peek";
import { Reader } from "./components/reader";
import { TabBar } from "./components/tab-bar";
import { usePeek } from "./components/use-peek";
import { initialTabs, messages } from "./data";
import { registry, replacement } from "./plugins";
import type { Message, Tab } from "./types";

/** Keyboard first. Shortcuts stand down while you are typing. */
function useShortcuts({
  onMove,
  onOpen,
  onReply,
  disabled,
}: {
  onMove: (delta: number) => void;
  onOpen: () => void;
  onReply: () => void;
  disabled: boolean;
}) {
  useEffect(() => {
    function handle(event: KeyboardEvent) {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable === true);
      if (typing || disabled) return;

      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        onMove(1);
      } else if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        onMove(-1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        onOpen();
      } else if (event.key === "r") {
        event.preventDefault();
        onReply();
      }
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onMove, onOpen, onReply, disabled]);
}

export function MosaicApp() {
  const [tabs, setTabs] = useState<Tab[]>(initialTabs);
  const [activeTabId, setActiveTabId] = useState(initialTabs[0].id);
  const [highlightedId, setHighlightedId] = useState(messages[0].id);
  const [composerOpen, setComposerOpen] = useState(false);
  const { peek, enter: peekEnter, leave: peekLeave } = usePeek();

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  /*
   * Switching tabs unmounts whatever the pointer was over without ever firing
   * its mouseleave, so a peek that was mid-delay would land on top of the new
   * tab. Close it whenever the tab changes.
   */
  useEffect(() => peekLeave(), [activeTabId, peekLeave]);
  const openMessage =
    activeTab.kind === "message"
      ? (messages.find((message) => message.id === activeTab.messageId) ?? null)
      : null;

  function openTab(tab: Tab) {
    setTabs((current) => (current.some((t) => t.id === tab.id) ? current : [...current, tab]));
    setActiveTabId(tab.id);
  }

  /** Reading a message opens it as its own tab, with the window to itself. */
  function openMessageTab(message: Message) {
    const standIn = replacement(message);
    openTab({
      id: `message:${message.id}`,
      label: message.subject,
      kind: "message",
      plugin: standIn?.plugin.id ?? "core",
      messageId: message.id,
    });
    setComposerOpen(false);
  }

  function closeTab(id: string) {
    setTabs((current) => {
      const next = current.filter((tab) => tab.id !== id);
      if (next.length === 0) return current;
      if (id === activeTabId) setActiveTabId(next[next.length - 1].id);
      return next;
    });
  }

  useShortcuts({
    disabled: composerOpen,
    onMove: (delta) => {
      if (activeTab.kind !== "mailbox") return;
      const index = messages.findIndex((message) => message.id === highlightedId);
      setHighlightedId(messages[Math.min(Math.max(index + delta, 0), messages.length - 1)].id);
    },
    onOpen: () => {
      if (activeTab.kind !== "mailbox") return;
      const message = messages.find((m) => m.id === highlightedId);
      if (message) openMessageTab(message);
    },
    onReply: () => {
      if (activeTab.kind === "message") setComposerOpen(true);
    },
  });

  const canvas = registry[activeTab.plugin].folderCanvas?.(activeTab.id);

  return (
    <TooltipProvider>
      <div className="isolate flex h-svh flex-col bg-canvas text-foreground">
        <TabBar
          tabs={tabs}
          activeId={activeTab.id}
          onSelect={setActiveTabId}
          onClose={closeTab}
          onHome={() => {
            const home = tabs.find((tab) => tab.kind === "mailbox");
            if (home) setActiveTabId(home.id);
          }}
          /*
           * Only a message tab has something to preview. A folder tab's label
           * already says its name and count, so a card would just repeat it.
           */
          onPeek={(tab, element) => {
            const message = messages.find((m) => m.id === tab.messageId);
            if (message) {
              peekEnter(message, {
                kind: "element",
                element,
                width: Math.round(element.getBoundingClientRect().width),
              });
            }
          }}
          onPeekLeave={peekLeave}
        />

        {/* Positioned, so a composer that floats can anchor to the surface it
            belongs to rather than to the window. */}
        <main className="relative mx-2 mb-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-background shadow-xs ring-1 ring-black/5">
          {activeTab.kind === "canvas" ? (
            (canvas ?? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Nothing here yet</EmptyTitle>
                  <EmptyDescription>
                    {registry[activeTab.plugin].name} has not built a view for this folder.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ))
          ) : activeTab.kind === "message" && openMessage ? (
            <>
              <Reader message={openMessage} />
              <Composer
                key={openMessage.id}
                message={openMessage}
                open={composerOpen}
                onOpenChange={setComposerOpen}
              />
            </>
          ) : (
            <MailPage
              title={activeTab.label}
              activeFolderId={activeTab.id}
              messages={messages}
              highlightedId={highlightedId}
              onHighlight={setHighlightedId}
              onOpen={openMessageTab}
              onOpenFolder={openTab}
              onPeek={(message, event) =>
                peekEnter(message, { kind: "pointer", x: event.clientX, y: event.clientY })
              }
              onPeekLeave={peekLeave}
            />
          )}
        </main>

        <PeekCard peek={peek} onClose={peekLeave} />
      </div>
    </TooltipProvider>
  );
}
