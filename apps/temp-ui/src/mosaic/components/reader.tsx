import { useState } from "react";
import { ArchiveIcon, ClockIcon, FileTextIcon, MoreHorizontalIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { collect, contributors, replacement } from "../plugins";
import type { Attachment, Message } from "../types";
import { Panel, PluginDot } from "./primitives";
import { MessageBody, QuotedBlock } from "./prose";

function AttachmentCard({ attachment }: { attachment: Attachment }) {
  return (
    <Panel
      footer={
        attachment.conflict ? (
          <>
            <PluginDot tone="deal" />
            <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {attachment.conflict.summary}
            </div>
            <Button variant="outline" size="xs">
              {attachment.conflict.action}
            </Button>
          </>
        ) : null
      }
    >
      <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium">{attachment.name}</div>
      <div className="shrink-0 text-xs text-muted-foreground tabular-nums">{attachment.size}</div>
      <Button variant="outline" size="xs">
        Preview
      </Button>
    </Panel>
  );
}

export function Reader({ message }: { message: Message }) {
  const [showOriginal, setShowOriginal] = useState(false);

  const above = collect("readerAbove", message);
  const below = collect("readerBelow", message);
  const stand_in = replacement(message);
  const credits = contributors(message);
  const recipients = message.to.map((p) => (p.initials === "LW" ? "me" : p.name)).join(", ");

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-8 py-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <h1 className="min-w-0 flex-1 text-lg font-semibold tracking-tight text-balance">
                {message.subject}
              </h1>
              {/* Actions sit with the thing they act on, not in a shared strip. */}
              <div className="flex shrink-0 items-center gap-0.5">
                <Button variant="ghost" size="icon-sm" aria-label="Archive">
                  <ArchiveIcon />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Snooze until later">
                  <ClockIcon />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="More actions">
                  <MoreHorizontalIcon />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Avatar size="sm" className="size-5 shrink-0">
                <AvatarFallback className="text-[0.5625rem]">
                  {message.from.initials}
                </AvatarFallback>
              </Avatar>
              <div className="shrink-0 text-xs font-medium">{message.from.name}</div>
              <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {message.from.email} · to {recipients}
              </div>
              {message.threadCount ? (
                <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {message.threadCount} messages
                </div>
              ) : null}
              <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                Today {message.time}
              </div>
            </div>
          </div>

          {/* slot: readerAbove — every plugin that has something to say. */}
          {above.map(({ plugin, node }) => (
            <div key={plugin.id}>{node}</div>
          ))}

          {/* slot: readerReplace — one plugin stands in for a template body,
              but the original is always one click away. */}
          {stand_in && !showOriginal ? (
            <div className="flex flex-col gap-2">
              {stand_in.node}
              <div>
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                  onClick={() => setShowOriginal(true)}
                >
                  Show the original message
                </Button>
              </div>
            </div>
          ) : (
            <>
              <MessageBody blocks={message.body} />
              {stand_in ? (
                <div>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-muted-foreground"
                    onClick={() => setShowOriginal(false)}
                  >
                    Back to the {stand_in.plugin.name} view
                  </Button>
                </div>
              ) : null}
            </>
          )}

          {message.attachments?.map((attachment) => (
            <AttachmentCard key={attachment.name} attachment={attachment} />
          ))}

          {message.quoted && !stand_in ? <QuotedBlock text={message.quoted} /> : null}

          {below.length > 0 ? <Separator /> : null}

          {/* slot: readerBelow — stitched context. */}
          {below.map(({ plugin, node }) => (
            <div key={plugin.id}>{node}</div>
          ))}

          {/* Provenance, not a headline: it belongs after what it describes. */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">
              {credits.length > 0 ? "Rendered by" : "No plugin touched this message"}
            </span>
            {credits.map((plugin) => (
              <span key={plugin.id} className="flex items-center gap-1.5">
                <PluginDot tone={plugin.tone} />
                <span className="text-xs text-muted-foreground">{plugin.name}</span>
              </span>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
