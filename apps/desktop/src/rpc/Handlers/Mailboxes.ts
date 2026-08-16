import { StorageError } from "@mosaic/contracts/backend/mail";
import * as Effect from "effect/Effect";

import { MailboxRepository } from "../../persistence/Services/Mailboxes.ts";

export const ListMailboxes = Effect.fn("Backend.ListMailboxes")(function* ({ accountId }) {
  const repository = yield* MailboxRepository;
  return yield* repository.list(accountId).pipe(
    Effect.mapError(
      () =>
        new StorageError({
          message: "The local mail store could not complete the request.",
        }),
    ),
  );
});
