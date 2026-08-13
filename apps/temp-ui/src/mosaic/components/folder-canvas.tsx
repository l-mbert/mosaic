import { ArrowUpRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dealFolderItems } from "../data";
import { registry } from "../plugins";
import { PluginDot } from "./primitives";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

/**
 * A canvas folder: the plugin gets the whole window, with no message list in
 * the way. This is where cross-source filtering finally has room — the sources
 * along the top are the same plugins that render slots elsewhere.
 */
export function DealFolder() {
  const sources = [
    { id: "core", label: "Mail", count: 12 },
    { id: "calendar", label: "Meetings", count: 3 },
    { id: "esign", label: "Documents", count: 2 },
    { id: "deal-desk", label: "Deal events", count: 8 },
  ] as const;

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex justify-center px-10 py-8">
        <div className="flex w-full max-w-page flex-col gap-6">
          <header className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tone-deal text-sm font-semibold text-white">
                A
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-xl font-semibold tracking-tight">Acme Inc</h1>
                  <Badge variant="outline" className="shrink-0 text-tone-attention">
                    Negotiation
                  </Badge>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  Renewal · owned by you · 6 people
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-end gap-8">
              <Fact label="Annual value" value="$84,000" />
              <Fact label="Close date" value="31 Mar 2027" />
              <Fact label="Last touch" value="Today" />
            </div>

            <Button variant="outline" size="sm" className="shrink-0">
              Open in CRM
              <ArrowUpRightIcon data-icon="inline-end" />
            </Button>
          </header>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="xs" className="rounded-full">
              Everything
              <span className="opacity-60 tabular-nums">25</span>
            </Button>
            {sources.map((source) => (
              <Button key={source.id} variant="outline" size="xs" className="rounded-full gap-1.5">
                <PluginDot tone={registry[source.id].tone} />
                {source.label}
                <span className="text-muted-foreground tabular-nums">{source.count}</span>
              </Button>
            ))}
          </div>

          <table className="w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className="border-b border-border pb-2 text-xs font-medium text-muted-foreground">
                  Item
                </th>
                <th className="border-b border-border pb-2 text-xs font-medium text-muted-foreground">
                  Who
                </th>
                <th className="border-b border-border pb-2 text-right text-xs font-medium text-muted-foreground">
                  When
                </th>
              </tr>
            </thead>
            <tbody>
              {dealFolderItems.map((item) => (
                <tr key={item.id} className="group">
                  <td className="border-b border-border py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <PluginDot tone={registry[item.plugin].tone} />
                      <span className="min-w-0 truncate text-[0.8125rem] font-medium">
                        {item.title}
                      </span>
                      <span className="min-w-0 truncate text-xs text-muted-foreground">
                        {item.meta}
                      </span>
                    </div>
                  </td>
                  <td className="border-b border-border py-2.5 text-xs text-muted-foreground">
                    {item.who}
                  </td>
                  <td className="border-b border-border py-2.5 text-right text-xs text-muted-foreground tabular-nums">
                    {item.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ScrollArea>
  );
}

export function NewslettersFolder() {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex justify-center px-10 py-8">
        <div className="flex w-full max-w-page flex-col gap-5">
          <header className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">Newsletters</h1>
            <p className="text-xs text-muted-foreground">
              22 messages bundled this week, kept out of the inbox.
            </p>
          </header>
          <div className="flex flex-col">
            {[
              ["Stratechery", "The aggregation of enterprise software", "Mon"],
              ["Product Hunt", "Today's top 5 launches", "Mon"],
              ["LinkedIn", "3 people viewed your profile", "Sun"],
              ["Figma", "Ana commented on Checkout v2", "Sun"],
              ["Vercel", "Your weekly usage summary", "Sat"],
            ].map(([source, title, when]) => (
              <button
                key={title}
                type="button"
                className="flex h-9 items-center gap-3 rounded-lg px-2 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">
                  {source}
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.8125rem]">{title}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{when}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
