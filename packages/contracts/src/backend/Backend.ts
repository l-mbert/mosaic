import * as RpcGroup from "effect/unstable/rpc/RpcGroup";

import { HealthRpcs } from "./HealthCheck.ts";
import { Rpcs as MailRpcs } from "./mail/Rpcs.ts";

export const BackendRpcs = RpcGroup.make().merge(HealthRpcs).merge(MailRpcs);
