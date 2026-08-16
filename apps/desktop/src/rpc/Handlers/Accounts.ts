import { StorageError } from "@mosaic/contracts/backend/mail";
import * as Effect from "effect/Effect";

import { AccountRepository } from "../../persistence/Services/Accounts.ts";

export const ListAccounts = Effect.fn("Backend.ListAccounts")(function* () {
  const repository = yield* AccountRepository;
  return yield* repository.list.pipe(
    Effect.mapError(
      () =>
        new StorageError({
          message: "The local mail store could not complete the request.",
        }),
    ),
  );
});
