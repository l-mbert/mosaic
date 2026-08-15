import * as Schema from "effect/Schema";

export const PROTOCOL_VERSION = 1 as const;

export const ClientHello = Schema.TaggedStruct("MosaicClientHello", {
  protocolVersion: Schema.Int,
});

export type ClientHello = typeof ClientHello.Type;

export const UtilityHandshakeResponse = Schema.TaggedUnion({
  MosaicUtilityReady: {
    protocolVersion: Schema.Literal(PROTOCOL_VERSION),
  },
  MosaicIncompatibleProtocol: {
    expectedVersion: Schema.Literal(PROTOCOL_VERSION),
    receivedVersion: Schema.Int,
  },
});

export const {
  MosaicUtilityReady: UtilityReady,
  MosaicIncompatibleProtocol: IncompatibleProtocol,
} = UtilityHandshakeResponse.cases;
export type UtilityReady = typeof UtilityReady.Type;
export type IncompatibleProtocol = typeof IncompatibleProtocol.Type;
export type UtilityHandshakeResponse = typeof UtilityHandshakeResponse.Type;
