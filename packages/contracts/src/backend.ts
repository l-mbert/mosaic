import { RpcGroup } from "effect/unstable/rpc";

import { HealthRpcs } from "./backend/health.ts";

export { HealthResult } from "./backend/health.ts";

export const BackendRpcs = RpcGroup.make().merge(HealthRpcs);
