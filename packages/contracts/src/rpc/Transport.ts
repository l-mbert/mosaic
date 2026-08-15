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

const Request = Schema.TaggedStruct("Request", {
  id: RequestId,
  tag: FrameTag,
  payload: Schema.Unknown,
  headers: Headers,
  isNotification: Schema.optionalKey(Schema.Literal(true)),
  traceId: Schema.optionalKey(TraceIdentifier),
  spanId: Schema.optionalKey(TraceIdentifier),
  sampled: Schema.optionalKey(Schema.Boolean),
});

const Ack = Schema.TaggedStruct("Ack", {
  requestId: RequestId,
});

const Interrupt = Schema.TaggedStruct("Interrupt", {
  requestId: RequestId,
});

const Ping = Schema.TaggedStruct("Ping", {});
const Eof = Schema.TaggedStruct("Eof", {});

export const BackendRpcClientFrame = Schema.Union([Request, Ack, Interrupt, Ping, Eof]);

export type BackendRpcClientFrame = typeof BackendRpcClientFrame.Type;

const Chunk = Schema.TaggedStruct("Chunk", {
  requestId: RequestId,
  values: Schema.NonEmptyArray(Schema.Unknown),
});

const FailureCause = Schema.Union([
  Schema.TaggedStruct("Fail", {
    error: Schema.Unknown,
  }),
  Schema.TaggedStruct("Die", {
    defect: Schema.Unknown,
  }),
  Schema.TaggedStruct("Interrupt", {
    fiberId: Schema.UndefinedOr(Schema.Number),
  }),
]);

const Exit = Schema.TaggedStruct("Exit", {
  requestId: RequestId,
  exit: Schema.Union([
    Schema.TaggedStruct("Success", {
      value: Schema.Unknown,
    }),
    Schema.TaggedStruct("Failure", {
      cause: Schema.Array(FailureCause),
    }),
  ]),
});

const Defect = Schema.TaggedStruct("Defect", {
  defect: Schema.Unknown,
});

const Pong = Schema.TaggedStruct("Pong", {});

export const BackendRpcServerFrame = Schema.Union([Chunk, Exit, Defect, Pong]);

export type BackendRpcServerFrame = typeof BackendRpcServerFrame.Type;
