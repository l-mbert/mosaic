import { Schema } from "effect";

import { PROTOCOL_VERSION } from "./handshake.ts";

export const UtilityStarted = Schema.TaggedStruct("MosaicUtilityStarted", {
  protocolVersion: Schema.Literal(PROTOCOL_VERSION),
});

export type UtilityStarted = typeof UtilityStarted.Type;

export const AttachRenderer = Schema.TaggedStruct("MosaicAttachRenderer", {
  protocolVersion: Schema.Literal(PROTOCOL_VERSION),
});

export type AttachRenderer = typeof AttachRenderer.Type;
