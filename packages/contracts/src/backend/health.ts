import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { PROTOCOL_VERSION } from "../handshake.ts";

export const HealthResult = Schema.Struct({
  status: Schema.Literal("healthy"),
  protocolVersion: Schema.Literal(PROTOCOL_VERSION),
});

export type HealthResult = typeof HealthResult.Type;

export const Health = Rpc.make("Health", {
  success: HealthResult,
});

export const HealthRpcs = RpcGroup.make(Health);
