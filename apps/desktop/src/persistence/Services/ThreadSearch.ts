import {
  type ThreadScope,
  ThreadSearchPage,
  type ThreadSearchCursor,
} from "@mosaic/contracts/backend/mail";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

import type { MailRepositoryError } from "../Errors.ts";

export interface ThreadSearchInput {
  readonly scope: ThreadScope;
  readonly query: string;
  readonly limit: number;
  readonly cursor: ThreadSearchCursor | null;
}

export interface ThreadSearchRepositoryService {
  readonly search: (
    input: ThreadSearchInput,
  ) => Effect.Effect<ThreadSearchPage, MailRepositoryError>;
}

export class ThreadSearchRepository extends Context.Service<
  ThreadSearchRepository,
  ThreadSearchRepositoryService
>()("mosaic/desktop/persistence/Services/ThreadSearch/ThreadSearchRepository") {}
