import { BackendMailError } from "@mosaic/contracts/backend/mail";

import type { MailEntityNotFound, MailRepositoryError } from "../../persistence/Errors.ts";

export const toBackendMailError = (error: MailEntityNotFound | MailRepositoryError) =>
  error._tag === "MailEntityNotFound"
    ? new BackendMailError({
        reason: "not-found",
        message: `The requested ${error.entity} was not found.`,
      })
    : new BackendMailError({
        reason: "storage",
        message: "The local mail store could not complete the request.",
      });
