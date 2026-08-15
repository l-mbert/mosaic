import * as Context from "effect/Context";
import type * as SqlClient from "effect/unstable/sql/SqlClient";

export class ReadSqlClient extends Context.Service<ReadSqlClient, SqlClient.SqlClient>()(
  "mosaic/desktop/persistence/Services/Database/ReadSqlClient",
) {}
