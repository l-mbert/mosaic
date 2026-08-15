import * as Schema from "effect/Schema";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";

import { PROTOCOL_VERSION } from "../rpc/Handshake.ts";

export const HealthResult = Schema.Struct({
  status: Schema.Literal("healthy"),
  protocolVersion: Schema.Literal(PROTOCOL_VERSION),
});

export type HealthResult = typeof HealthResult.Type;

export const Health = Rpc.make("Health", {
  success: HealthResult,
});

export const HealthRpcs = RpcGroup.make(Health);
