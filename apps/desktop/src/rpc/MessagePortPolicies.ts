import { BackendRpcs } from "@mosaic/contracts/backend";
import { BackendRpcClientFrame } from "@mosaic/contracts/rpc/transport";
import { Result, Schema } from "effect";
import * as Match from "effect/Match";
import type * as RpcMessage from "effect/unstable/rpc/RpcMessage";

export type RequestId = string | number;

class DuplicateRequestId extends Schema.TaggedClass<DuplicateRequestId>()(
  "DuplicateRequestId",
  {},
) {}

class OutstandingRequestLimitExceeded extends Schema.TaggedClass<OutstandingRequestLimitExceeded>()(
  "OutstandingRequestLimitExceeded",
  { limit: Schema.Int },
) {}

class InvalidFrame extends Schema.TaggedClass<InvalidFrame>()("InvalidFrame", {}) {}

class UnknownRpc extends Schema.TaggedClass<UnknownRpc>()("UnknownRpc", {
  rpcTag: Schema.String,
}) {}

class InvalidPayload extends Schema.TaggedClass<InvalidPayload>()("InvalidPayload", {
  rpcTag: Schema.String,
}) {}

const RequestTrackingRejection = Schema.Union([
  DuplicateRequestId,
  OutstandingRequestLimitExceeded,
]);
type RequestTrackingRejection = typeof RequestTrackingRejection.Type;

export const FrameRejection = Schema.Union([
  InvalidFrame,
  UnknownRpc,
  InvalidPayload,
  RequestTrackingRejection,
]);
export type FrameRejection = typeof FrameRejection.Type;

export interface OutstandingRequestTracker {
  readonly size: number;
  admit(requestId: RequestId): Result.Result<void, RequestTrackingRejection>;
  rollback(requestId: RequestId): void;
  observeResponse(response: RpcMessage.FromServerEncoded): void;
}

export const makeOutstandingRequestTracker = (capacity: number): OutstandingRequestTracker => {
  const requestIds = new Set<RequestId>();

  return {
    get size() {
      return requestIds.size;
    },
    admit(requestId) {
      if (requestIds.has(requestId)) {
        return Result.fail(new DuplicateRequestId());
      }
      if (requestIds.size >= capacity) {
        return Result.fail(new OutstandingRequestLimitExceeded({ limit: capacity }));
      }
      requestIds.add(requestId);
      return Result.succeed(undefined);
    },
    rollback(requestId) {
      requestIds.delete(requestId);
    },
    observeResponse(response) {
      Match.value(response).pipe(
        Match.tags({
          Exit: ({ requestId }) => requestIds.delete(requestId),
          Defect: () => requestIds.clear(),
          ClientProtocolError: () => requestIds.clear(),
          Chunk: () => undefined,
          Pong: () => undefined,
        }),
        Match.exhaustive,
      );
    },
  };
};

export const admitFrame = (
  input: typeof Schema.Unknown.Type,
  tracker: OutstandingRequestTracker,
): Result.Result<BackendRpcClientFrame, FrameRejection> => {
  const decoded = Schema.decodeUnknownResult(BackendRpcClientFrame)(input);
  if (Result.isFailure(decoded)) {
    return Result.fail(new InvalidFrame());
  }

  let frame = decoded.success;
  if (frame._tag !== "Request") {
    return Result.succeed(frame);
  }

  const rpc = BackendRpcs.requests.get(frame.tag);
  if (rpc === undefined) {
    return Result.fail(new UnknownRpc({ rpcTag: frame.tag }));
  }

  const payloadCodec = Schema.toCodecJson(rpc.payloadSchema);
  const payload = Result.flatMap(
    Schema.decodeUnknownResult(payloadCodec)(frame.payload),
    Schema.encodeUnknownResult(payloadCodec),
  );
  if (Result.isFailure(payload)) {
    return Result.fail(new InvalidPayload({ rpcTag: frame.tag }));
  }

  frame = { ...frame, payload: payload.success };
  return Result.map(tracker.admit(frame.id), () => frame);
};
