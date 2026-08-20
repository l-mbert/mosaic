import { assert, describe, it } from "@effect/vitest";
import { BackendRpcClientFrame, BackendRpcServerFrame } from "@mosaic/contracts/rpc/transport";
import { Result } from "effect";

import {
  admitFrame,
  makeOutstandingRequestTracker,
  type RequestId,
} from "./MessagePortPolicies.ts";

const requestFrame = (id: RequestId, tag: string) =>
  BackendRpcClientFrame.make({
    _tag: "Request",
    id,
    tag,
    payload: {},
    headers: [],
  });

describe("message port policies", () => {
  it("enforces capacity, detects duplicates first, and supports rollback", () => {
    const tracker = makeOutstandingRequestTracker(32);

    assert.isTrue(Result.isSuccess(tracker.admit("rollback")));
    const duplicateBeforeRollback = tracker.admit("rollback");
    assert.isTrue(Result.isFailure(duplicateBeforeRollback));
    if (Result.isFailure(duplicateBeforeRollback)) {
      assert.strictEqual(duplicateBeforeRollback.failure._tag, "DuplicateRequestId");
    }
    tracker.rollback("rollback");
    assert.strictEqual(tracker.size, 0);

    for (let requestId = 0; requestId < 32; requestId += 1) {
      assert.isTrue(Result.isSuccess(tracker.admit(requestId)));
    }
    assert.strictEqual(tracker.size, 32);

    const duplicateAtCapacity = tracker.admit(0);
    assert.isTrue(Result.isFailure(duplicateAtCapacity));
    if (Result.isFailure(duplicateAtCapacity)) {
      assert.strictEqual(duplicateAtCapacity.failure._tag, "DuplicateRequestId");
    }

    const overCapacity = tracker.admit(32);
    assert.isTrue(Result.isFailure(overCapacity));
    if (Result.isFailure(overCapacity)) {
      assert.strictEqual(overCapacity.failure._tag, "OutstandingRequestLimitExceeded");
      if (overCapacity.failure._tag === "OutstandingRequestLimitExceeded") {
        assert.strictEqual(overCapacity.failure.limit, 32);
      }
    }
  });

  it("removes Exit requests and clears all requests for Defect", () => {
    const tracker = makeOutstandingRequestTracker(32);
    tracker.admit(1);
    tracker.admit(2);

    tracker.observeResponse(BackendRpcServerFrame.make({ _tag: "Pong" }));
    assert.strictEqual(tracker.size, 2);

    tracker.observeResponse(
      BackendRpcServerFrame.make({
        _tag: "Exit",
        requestId: 1,
        exit: { _tag: "Success", value: undefined },
      }),
    );
    assert.strictEqual(tracker.size, 1);

    tracker.observeResponse(BackendRpcServerFrame.make({ _tag: "Defect", defect: undefined }));
    assert.strictEqual(tracker.size, 0);
  });

  it("rejects an invalid outer frame", () => {
    const result = admitFrame({ _tag: "Request" }, makeOutstandingRequestTracker(32));

    assert.isTrue(Result.isFailure(result));
    if (Result.isFailure(result)) {
      assert.strictEqual(result.failure._tag, "InvalidFrame");
    }
  });

  it("rejects an unknown RPC", () => {
    const result = admitFrame(requestFrame(1, "DoesNotExist"), makeOutstandingRequestTracker(32));

    assert.isTrue(Result.isFailure(result));
    if (Result.isFailure(result)) {
      assert.strictEqual(result.failure._tag, "UnknownRpc");
      if (result.failure._tag === "UnknownRpc") {
        assert.strictEqual(result.failure.rpcTag, "DoesNotExist");
      }
    }
  });

  it("rejects an invalid RPC payload", () => {
    const result = admitFrame(requestFrame(1, "ReadThread"), makeOutstandingRequestTracker(32));

    assert.isTrue(Result.isFailure(result));
    if (Result.isFailure(result)) {
      assert.strictEqual(result.failure._tag, "InvalidPayload");
      if (result.failure._tag === "InvalidPayload") {
        assert.strictEqual(result.failure.rpcTag, "ReadThread");
      }
    }
  });

  it("admits and canonicalizes a valid RPC request", () => {
    const tracker = makeOutstandingRequestTracker(32);
    const result = admitFrame(requestFrame(1, "ListAccounts"), tracker);

    assert.isTrue(Result.isSuccess(result));
    assert.strictEqual(tracker.size, 1);
    if (Result.isSuccess(result)) {
      assert.strictEqual(result.success._tag, "Request");
      if (result.success._tag === "Request") {
        assert.deepStrictEqual(result.success.payload, {});
      }
    }
  });
});
