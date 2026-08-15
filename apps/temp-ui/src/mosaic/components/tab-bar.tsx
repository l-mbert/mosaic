import { LayoutGridIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { registry } from "../plugins";
import type { Tab } from "../types";

function TabItem({
  tab,
  active,
  onSelect,
  onClose,
  onPeek,
  onPeekLeave,
}: {
  tab: Tab;
  active: boolean;
  onSelect: () => void;
  onClose: () => void;
  onPeek: (tab: Tab, element: HTMLElement) => void;
  onPeekLeave: () => void;
}) {
  const Icon = registry[tab.plugin].icon;

  return (
    <div
      // No peek for the tab you are already looking at — the card would just
      // cover a smaller copy of what is on screen behind it.
      onMouseEnter={(event) => !active && onPeek(tab, event.currentTarget)}
      onMouseLeave={onPeekLeave}
      className={cn(
        // Padding and in-flow children are identical in every state, so a tab
        // cannot change width when it is hovered or when it becomes active.
        "group relative flex h-7 min-w-48 max-w-72 shrink items-center gap-2 rounded-md px-2.5",
        active ? "bg-background shadow-xs ring-1 ring-black/5" : "hover:bg-black/4",
      )}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={onSelect}
        className="absolute inset-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="sr-only">{tab.label}</span>
      </button>

      {/* pointer-events-none: these paint above the hit overlay, so without it
          they swallow the click and the tab does not switch. */}
      <Icon
        className={cn(
          "pointer-events-none relative size-3.5 shrink-0",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      />

      {/*
       * Label and count share one masked box. On hover the label dissolves under
       * the close button instead of truncating, and the count steps aside — the
       * box itself never changes size, so the tab cannot jump.
       */}
      <div
        className={cn(
          "pointer-events-none relative flex min-w-0 flex-1 items-center gap-1.5",
          active ? "fade-end" : "group-hover:fade-end",
        )}
      >
        {/*
         * No flex-1: the count belongs beside its label, not adrift at the far
         * edge of a wide tab. And no weight change on active — bolder text
         * measures ~2px wider and nudged every tab after it. The white pill
         * already carries the emphasis, so colour alone marks the active tab.
         */}
        <span className={cn("min-w-0 truncate text-xs", !active && "text-muted-foreground")}>
          {tab.label}
        </span>
        {tab.count === undefined || active ? null : (
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums group-hover:invisible">
            {tab.count}
          </span>
        )}
      </div>

      {/* Absolute in both states: the close button never occupies layout. */}
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Close ${tab.label}`}
        onClick={onClose}
        className={cn("absolute right-1.5 size-5", active ? "flex" : "hidden group-hover:flex")}
      >
        <XIcon />
      </Button>
    </div>
  );
}

export function TabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onHome,
  onPeek,
  onPeekLeave,
}: {
  tabs: Tab[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onHome: () => void;
  onPeek: (tab: Tab, element: HTMLElement) => void;
  onPeekLeave: () => void;
}) {
  return (
    <header className="flex h-10 shrink-0 items-center gap-1.5 pr-2 pl-3">
      <div aria-hidden className="flex shrink-0 items-center gap-2">
        <span className="size-3 rounded-full bg-black/12" />
        <span className="size-3 rounded-full bg-black/12" />
        <span className="size-3 rounded-full bg-black/12" />
      </div>

      <Button variant="ghost" size="icon-sm" aria-label="Go to mail" onClick={onHome}>
        <LayoutGridIcon />
      </Button>

      <div role="tablist" className="flex min-w-0 flex-1 items-center gap-0.5">
        {tabs.map((tab, i) => {
          const active = tab.id === activeId;
          // A hairline shows only between two quiet tabs, but the element is
          // always in the layout — dropping it would drop its gap too and nudge
          // every tab after it sideways.
          const divider = i > 0 && !active && tabs[i - 1].id !== activeId;
          return (
            <div key={tab.id} className="flex min-w-0 shrink items-center gap-0.5">
              {i > 0 ? (
                <span
                  aria-hidden
                  className={cn("h-4 w-px shrink-0", divider ? "bg-border" : "bg-transparent")}
                />
              ) : null}
              <TabItem
                tab={tab}
                active={active}
                onSelect={() => onSelect(tab.id)}
                onClose={() => onClose(tab.id)}
                onPeek={onPeek}
                onPeekLeave={onPeekLeave}
              />
            </div>
          );
        })}

        <Button variant="ghost" size="icon-sm" aria-label="Open a folder" className="shrink-0">
          <PlusIcon />
        </Button>
      </div>

      <Button variant="ghost" size="sm" className="shrink-0 gap-1.5 text-muted-foreground">
        <SearchIcon data-icon="inline-start" />
        <Kbd className="bg-transparent">⌘K</Kbd>
      </Button>
    </header>
  );
}
