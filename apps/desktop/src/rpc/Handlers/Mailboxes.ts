import * as Effect from "effect/Effect";

import { MailboxRepository } from "../../persistence/Services/Mailboxes.ts";
import { toBackendMailError } from "./Errors.ts";

export const ListMailboxes = Effect.fn("Backend.ListMailboxes")(function* ({ accountId }) {
  const repository = yield* MailboxRepository;
  return yield* repository.list(accountId).pipe(Effect.mapError(toBackendMailError));
});
