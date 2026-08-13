import { Schema } from "effect";
import type { FromClientEncoded, FromServerEncoded } from "effect/unstable/rpc/RpcMessage";

const RequestId = Schema.Union([Schema.String, Schema.Number]);

const Request = Schema.TaggedStruct("Request", {
  id: RequestId,
  tag: Schema.String,
  payload: Schema.Unknown,
  headers: Schema.Array(Schema.mutable(Schema.Tuple([Schema.String, Schema.String]))),
  isNotification: Schema.optionalKey(Schema.Literal(true)),
  traceId: Schema.optionalKey(Schema.String),
  spanId: Schema.optionalKey(Schema.String),
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

const clientFrameTypeCheck: FromClientEncoded = null as unknown as BackendRpcClientFrame;
const serverFrameTypeCheck: FromServerEncoded = null as unknown as BackendRpcServerFrame;

void clientFrameTypeCheck;
void serverFrameTypeCheck;
