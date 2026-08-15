import * as Schema from "effect/Schema";

import { PROTOCOL_VERSION } from "../rpc/Handshake.ts";

export const UtilityBooted = Schema.TaggedStruct("MosaicUtilityBooted", {
  protocolVersion: Schema.Literal(PROTOCOL_VERSION),
});

export type UtilityBooted = typeof UtilityBooted.Type;

export const UtilityBackendReady = Schema.TaggedStruct("MosaicUtilityBackendReady", {
  protocolVersion: Schema.Literal(PROTOCOL_VERSION),
});

export type UtilityBackendReady = typeof UtilityBackendReady.Type;

export const UtilityLifecycleMessage = Schema.Union([UtilityBooted, UtilityBackendReady]);
export type UtilityLifecycleMessage = typeof UtilityLifecycleMessage.Type;

export const AttachRenderer = Schema.TaggedStruct("MosaicAttachRenderer", {
  protocolVersion: Schema.Literal(PROTOCOL_VERSION),
});

export type AttachRenderer = typeof AttachRenderer.Type;
