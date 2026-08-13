import { Schema } from "effect";

export const PROTOCOL_VERSION = 1 as const;

export const ClientHello = Schema.TaggedStruct("MosaicClientHello", {
  protocolVersion: Schema.Int,
});

export type ClientHello = typeof ClientHello.Type;

export const UtilityReady = Schema.TaggedStruct("MosaicUtilityReady", {
  protocolVersion: Schema.Literal(PROTOCOL_VERSION),
});

export type UtilityReady = typeof UtilityReady.Type;

export const IncompatibleProtocol = Schema.TaggedStruct("MosaicIncompatibleProtocol", {
  expectedVersion: Schema.Literal(PROTOCOL_VERSION),
  receivedVersion: Schema.Int,
});

export type IncompatibleProtocol = typeof IncompatibleProtocol.Type;

export const UtilityHandshakeResponse = Schema.Union([UtilityReady, IncompatibleProtocol]);

export type UtilityHandshakeResponse = typeof UtilityHandshakeResponse.Type;
