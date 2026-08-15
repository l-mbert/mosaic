import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import {
  ClientHello,
  IncompatibleProtocol,
  PROTOCOL_VERSION,
  UtilityHandshakeResponse,
  UtilityReady,
} from "./Handshake.ts";

describe("desktop handshake", () => {
  it.effect("decodes the current protocol handshake", () =>
    Effect.gen(function* () {
      const hello = yield* Schema.decodeUnknownEffect(ClientHello)({
        _tag: "MosaicClientHello",
        protocolVersion: PROTOCOL_VERSION,
      });
      const ready = yield* Schema.decodeUnknownEffect(UtilityHandshakeResponse)(
        UtilityReady.make({ protocolVersion: PROTOCOL_VERSION }),
      );

      assert.strictEqual(hello.protocolVersion, PROTOCOL_VERSION);
      assert.strictEqual(ready._tag, "MosaicUtilityReady");
    }),
  );

  it.effect("preserves an incompatible version for a useful rejection", () =>
    Effect.gen(function* () {
      const hello = yield* Schema.decodeUnknownEffect(ClientHello)({
        _tag: "MosaicClientHello",
        protocolVersion: 9,
      });
      const rejection = yield* Schema.decodeUnknownEffect(UtilityHandshakeResponse)(
        IncompatibleProtocol.make({
          expectedVersion: PROTOCOL_VERSION,
          receivedVersion: hello.protocolVersion,
        }),
      );

      assert.strictEqual(rejection._tag, "MosaicIncompatibleProtocol");
      if (rejection._tag !== "MosaicIncompatibleProtocol") {
        return assert.fail("Expected an incompatible protocol response.");
      }
      assert.strictEqual(rejection.receivedVersion, 9);
    }),
  );
});
