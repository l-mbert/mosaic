import * as Schema from "effect/Schema";

const RequestId = Schema.Union([Schema.String.check(Schema.isMaxLength(256)), Schema.Finite]);
const FrameTag = Schema.NonEmptyString.check(Schema.isMaxLength(128));
const TraceIdentifier = Schema.String.check(Schema.isMaxLength(128));
const Header = Schema.mutable(
  Schema.Tuple([
    Schema.NonEmptyString.check(Schema.isMaxLength(128)),
    Schema.String.check(Schema.isMaxLength(8_192)),
  ]),
);
const Headers = Schema.Array(Header).check(Schema.isMaxLength(64));

export const BackendRpcClientFrame = Schema.TaggedUnion({
  Request: {
    id: RequestId,
    tag: FrameTag,
    payload: Schema.Unknown,
    headers: Headers,
    isNotification: Schema.optionalKey(Schema.Literal(true)),
    traceId: Schema.optionalKey(TraceIdentifier),
    spanId: Schema.optionalKey(TraceIdentifier),
    sampled: Schema.optionalKey(Schema.Boolean),
  },
  Ack: { requestId: RequestId },
  Interrupt: { requestId: RequestId },
  Ping: {},
  Eof: {},
});

export type BackendRpcClientFrame = typeof BackendRpcClientFrame.Type;

const FailureCause = Schema.TaggedUnion({
  Fail: {
    error: Schema.Unknown,
  },
  Die: {
    defect: Schema.Unknown,
  },
  Interrupt: {
    fiberId: Schema.UndefinedOr(Schema.Number),
  },
});

const RpcExit = Schema.TaggedUnion({
  Success: {
    value: Schema.Unknown,
  },
  Failure: {
    cause: Schema.Array(FailureCause),
  },
});

export const BackendRpcServerFrame = Schema.TaggedUnion({
  Chunk: {
    requestId: RequestId,
    values: Schema.NonEmptyArray(Schema.Unknown),
  },
  Exit: {
    requestId: RequestId,
    exit: RpcExit,
  },
  Defect: { defect: Schema.Unknown },
  Pong: {},
});

export type BackendRpcServerFrame = typeof BackendRpcServerFrame.Type;
