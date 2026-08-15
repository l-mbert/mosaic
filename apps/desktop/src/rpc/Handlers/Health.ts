import { HealthResult } from "@mosaic/contracts/backend/health";
import { PROTOCOL_VERSION } from "@mosaic/contracts/rpc/handshake";
import * as Effect from "effect/Effect";

export const Health = () =>
  Effect.succeed(
    HealthResult.make({
      status: "healthy",
      protocolVersion: PROTOCOL_VERSION,
    }),
  );
