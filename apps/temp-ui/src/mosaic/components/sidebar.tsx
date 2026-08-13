import { cn } from "@/lib/utils";
import { allPlugins } from "../plugins";
import type { Folder, Plugin, Tab } from "../types";

/** Deal folders carry a letter; everything else wears its plugin's icon. */
function FolderMark({ folder, plugin }: { folder: Folder; plugin: Plugin }) {
  if (folder.mark) {
    return (
      <span
        className={cn(
          "flex size-4.5 shrink-0 items-center justify-center rounded text-[0.5625rem] font-semibold text-white",
          plugin.tone === "deal" && "bg-tone-deal",
          plugin.tone === "esign" && "bg-tone-esign",
          plugin.tone === "ai" && "bg-tone-ai",
          plugin.tone === "neutral" && "bg-tone-neutral",
        )}
      >
        {folder.mark}
      </span>
    );
  }
  const Icon = plugin.icon;
  return <Icon className="size-4 shrink-0 text-muted-foreground" />;
}

/**
 * The sidebar belongs to the home page, not to the whole window — a message or
 * a plugin canvas opens in its own tab and gets the full width. Mail is a thing
 * people already know how to use, so its folders are visible, not behind a
 * popover. Plugins contribute their sections through the same slot.
 */
export function Sidebar({ activeId, onOpen }: { activeId: string; onOpen: (tab: Tab) => void }) {
  const sections = allPlugins.filter((plugin) => plugin.section && plugin.folders?.length);

  return (
    <aside className="flex w-52 shrink-0 flex-col gap-7 overflow-y-auto py-1">
      {sections.map((plugin) => (
        <nav key={plugin.id} className="flex flex-col gap-1">
          <div className="flex h-6 items-center px-2">
            <div className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
              {plugin.section}
            </div>
          </div>

          {plugin.folders?.map((folder) => {
            const active = folder.id === activeId;
            return (
              <button
                key={folder.id}
                type="button"
                aria-current={active}
                onClick={() =>
                  onOpen({
                    id: folder.id,
                    label: folder.label,
                    kind: folder.canvas ? "canvas" : "mailbox",
                    plugin: plugin.id,
                    count: folder.count,
                  })
                }
                className={cn(
                  "flex h-8 items-center gap-2.5 rounded-lg px-2 text-left outline-none",
                  "focus-visible:ring-3 focus-visible:ring-ring/50",
                  active ? "bg-black/6" : "hover:bg-black/4",
                )}
              >
                <FolderMark folder={folder} plugin={plugin} />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[0.8125rem]",
                    active ? "font-medium" : "text-muted-foreground",
                  )}
                >
                  {folder.label}
                </span>
                {folder.count === undefined ? null : (
                  <span
                    className={cn(
                      "shrink-0 text-xs tabular-nums",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {folder.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      ))}
    </aside>
  );
}
