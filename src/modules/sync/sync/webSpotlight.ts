import { ManagementClient } from "@kontent-ai/management-sdk";
import { match, P } from "ts-pattern";

import { WebSpotlightDiffModel } from "../types/diffModel.js";

export const updateWebSpotlight = (client: ManagementClient, diffModel: WebSpotlightDiffModel): Promise<unknown> =>
  match(diffModel)
    .with({ change: "none" }, () => Promise.resolve())
    .with({ change: "deactivate" }, () => client.deactivateWebSpotlight().toPromise())
    .with(
      { change: P.union("activate", "changeRootType") },
      ws => client.activateWebSpotlight().withData({ root_type: { codename: ws.rootTypeCodename } }).toPromise(),
    )
    .exhaustive();
