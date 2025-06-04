import type { ManagementClient } from "@kontent-ai/management-sdk";
import { P, match } from "ts-pattern";

import { type LogOptions, logInfo } from "../../../log.js";
import type { WebSpotlightDiffModel } from "../types/diffModel.js";

export const updateWebSpotlight = (
  client: ManagementClient,
  diffModel: WebSpotlightDiffModel,
  logOptions: LogOptions,
): Promise<unknown> =>
  match(diffModel)
    .with({ change: "none" }, () => {
      logInfo(logOptions, "standard", "No web spotlight changes to perform");
      return Promise.resolve();
    })
    .with({ change: "deactivate" }, () => {
      logInfo(logOptions, "standard", "Deactivating web spotlight");
      return client.deactivateWebSpotlight().toPromise();
    })
    .with({ change: P.union("activate", "changeRootType") }, (ws) => {
      logInfo(logOptions, "standard", "Updating web spotlight");
      return client
        .activateWebSpotlight()
        .withData({ root_type: { codename: ws.rootTypeCodename } })
        .toPromise();
    })
    .exhaustive();
