import * as RpcGroup from "effect/unstable/rpc/RpcGroup";

import { HealthRpcs } from "./HealthCheck.ts";
import { MailRpcs } from "./mail/Mail.ts";

export const BackendRpcs = RpcGroup.make().merge(HealthRpcs).merge(MailRpcs);
