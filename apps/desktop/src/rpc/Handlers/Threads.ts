import { NotFoundError, StorageError, type ThreadDetail } from "@mosaic/contracts/backend/mail";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";

import { ThreadRepository, type StoredThreadDetail } from "../../persistence/Services/Threads.ts";
import { sanitizeMailHtml } from "../MailHtml.ts";

const sanitizeThreadDetail = ({ thread, messages }: StoredThreadDetail): ThreadDetail => ({
  thread,
  messages: messages.map((message) => ({
    ...message,
    body: {
      text: message.body.text,
      html: message.body.html === null ? null : sanitizeMailHtml(message.body.html),
    },
  })),
});

export const QueryThreads = Effect.fn("Backend.QueryThreads")(function* (input) {
  const repository = yield* ThreadRepository;
  return yield* repository.query(input).pipe(
    Effect.mapError(
      () =>
        new StorageError({
          message: "The local mail store could not complete the request.",
        }),
    ),
  );
});

export const ReadThread = Effect.fn("Backend.ReadThread")(function* ({ threadId }) {
  const repository = yield* ThreadRepository;
  return yield* repository.read(threadId).pipe(
    Effect.map(sanitizeThreadDetail),
    Effect.mapError((error) =>
      Match.value(error).pipe(
        Match.tag(
          "MailEntityNotFound",
          ({ entity }) =>
            new NotFoundError({
              message: `The requested ${entity} was not found.`,
            }),
        ),
        Match.tag(
          "MailRepositoryError",
          () =>
            new StorageError({
              message: "The local mail store could not complete the request.",
            }),
        ),
        Match.exhaustive,
      ),
    ),
  );
});
