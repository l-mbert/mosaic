import * as Effect from "effect/Effect";

import { AccountRepository } from "../../persistence/Services/Accounts.ts";
import { toBackendMailError } from "./Errors.ts";

export const ListAccounts = Effect.fn("Backend.ListAccounts")(function* () {
  const repository = yield* AccountRepository;
  return yield* repository.list.pipe(Effect.mapError(toBackendMailError));
});
