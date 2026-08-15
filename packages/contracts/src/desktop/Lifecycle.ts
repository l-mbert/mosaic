import * as Schema from "effect/Schema";

import { PROTOCOL_VERSION } from "../rpc/Handshake.ts";

export const UtilityLifecycleMessage = Schema.TaggedUnion({
  MosaicUtilityBooted: {
    protocolVersion: Schema.Literal(PROTOCOL_VERSION),
  },
  MosaicUtilityBackendReady: {
    protocolVersion: Schema.Literal(PROTOCOL_VERSION),
  },
});

export const {
  MosaicUtilityBooted: UtilityBooted,
  MosaicUtilityBackendReady: UtilityBackendReady,
} = UtilityLifecycleMessage.cases;
export type UtilityBooted = typeof UtilityBooted.Type;
export type UtilityBackendReady = typeof UtilityBackendReady.Type;
export type UtilityLifecycleMessage = typeof UtilityLifecycleMessage.Type;

export const AttachRenderer = Schema.TaggedStruct("MosaicAttachRenderer", {
  protocolVersion: Schema.Literal(PROTOCOL_VERSION),
});

export type AttachRenderer = typeof AttachRenderer.Type;
