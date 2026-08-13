import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Mosaic does the mail. Plugins get a fixed set of places to put things, and
 * the set is identical for every plugin — a plugin is defined entirely by which
 * of these slots it chooses to fill.
 *
 * Every slot function may return null, which means "nothing to say about this
 * message". Opting out is the normal case, not an error.
 */

export type PluginId =
  | "core"
  | "deal-desk"
  | "esign"
  | "calendar"
  | "digest"
  | "travel"
  /** The assistant is a plugin like any other — it holds no privileged slot. */
  | "assistant";

export type Tone = "neutral" | "deal" | "esign" | "ai";

export interface Person {
  name: string;
  email: string;
  initials: string;
}

/** A folder a plugin contributes to the navigator. Can be opened as a tab. */
export interface Folder {
  id: string;
  label: string;
  count?: number;
  /** Folders with their own canvas render a plugin view instead of a mail list. */
  canvas?: boolean;
  /** A single letter shown instead of the plugin's icon, for named things. */
  mark?: string;
}

/** A facet chip a plugin adds to the toolbar of a mailbox. */
export interface Filter {
  id: string;
  label: string;
  count?: number;
}

export interface ComposerAction {
  label: string;
  primary?: boolean;
}

export interface Plugin {
  id: PluginId;
  name: string;
  tone: Tone;
  /** The mark shown wherever this plugin is named — tabs, navigator. */
  icon: LucideIcon;

  // ---- navigation slots -------------------------------------------------
  /** Section title shown in the navigator above this plugin's folders. */
  section?: string;
  folders?: Folder[];
  filters?: Filter[];

  // ---- list slot --------------------------------------------------------
  /** One compact snippet on the row. One line, or nothing. */
  listBadge?: (message: Message) => ReactNode;

  // ---- reader slots -----------------------------------------------------
  /** A panel above the original mail. */
  readerAbove?: (message: Message) => ReactNode;
  /**
   * Renders in place of the mail body. For messages whose body is a template
   * that says nothing — a signature request, a bundled digest.
   */
  readerReplace?: (message: Message) => ReactNode;
  /** Stitched context below the mail. */
  readerBelow?: (message: Message) => ReactNode;

  // ---- composer slots ---------------------------------------------------
  /** Offered only while the draft is empty. */
  composerSuggestions?: (message: Message) => string[] | null;
  composerActions?: (message: Message) => ComposerAction[] | null;

  // ---- canvas slot ------------------------------------------------------
  /** The full-width view behind one of this plugin's canvas folders. */
  folderCanvas?: (folderId: string) => ReactNode;
}

/** A fragment of prose a plugin recognised, with the verb it offers for it. */
export interface Entity {
  label: string;
  action: string;
  plugin: PluginId;
}

export type Span = { text: string; entity?: Entity };

export type Block = { type: "paragraph" | "signoff"; spans: Span[] };

export interface Attachment {
  name: string;
  size: string;
  /** A contradiction between the file and the message body. */
  conflict?: { summary: string; action: string };
}

export interface Deal {
  account: string;
  stage: string;
  value: string;
  closeDate: string;
}

export interface Envelope {
  signed: number;
  total: number;
  waitingOn: string;
  parties: { name: string; signed: boolean }[];
}

export interface Invite {
  when: string;
  duration: string;
  guests: number;
}

export interface Trip {
  route: string;
  depart: string;
  flight: string;
  seat: string;
}

export interface DigestItem {
  source: string;
  title: string;
}

interface MessageBase {
  id: string;
  from: Person;
  to: Person[];
  subject: string;
  preview: string;
  time: string;
  unread: boolean;
  threadCount?: number;
  bucket: "needs-you" | "everything";
  /** One line the assistant plugin may surface in place of the raw preview. */
  gist?: string;
  body: Block[];
  quoted?: string;
  attachments?: Attachment[];
  /** Structured payloads the plugins read. A message may carry none. */
  deal?: Deal;
  envelope?: Envelope;
  invite?: Invite;
  trip?: Trip;
  digest?: { count: number; items: DigestItem[] };
}

export type Message = MessageBase;

/** A row inside a plugin's full-canvas folder, from any source. */
export interface FolderItem {
  id: string;
  plugin: PluginId;
  title: string;
  meta: string;
  who: string;
  time: string;
}

/** A stitched item from another source. */
export interface TimelineItem {
  id: string;
  plugin: PluginId;
  title: string;
  meta: string;
  time: string;
}

/** An open working context. Mail is several of these at once. */
export interface Tab {
  id: string;
  label: string;
  /**
   * "mailbox" lists a folder across the whole page, "canvas" hands the plugin
   * the window, "message" is one open mail. Reading a message opens a tab
   * rather than squeezing it into a column beside the list.
   */
  kind: "mailbox" | "canvas" | "message";
  plugin: PluginId;
  count?: number;
  messageId?: string;
}
