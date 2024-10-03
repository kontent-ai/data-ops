import { ManagementClient } from "@kontent-ai/management-sdk";
import { oraPromise } from "ora";
import { match, P } from "ts-pattern";

import { logInfo, LogOptions } from "../../../log.js";
import { noSyncTaskEmoji } from "../constants/emojiCodes.js";
import { WebSpotlightDiffModel } from "../types/diffModel.js";

export const updateWebSpotlight = (
  client: ManagementClient,
  diffModel: WebSpotlightDiffModel,
  logOptions: LogOptions,
): Promise<unknown> =>
  match(diffModel)
    .with({ change: "none" }, () => {
      logInfo(logOptions, "standard", `${noSyncTaskEmoji} No web spotlight changes to perform`);
      return Promise.resolve();
    })
    .with({ change: "deactivate" }, () => {
      return oraPromise(client.deactivateWebSpotlight().toPromise(), { text: "Deactivating web spotlight" });
    })
    .with(
      { change: P.union("activate", "changeRootType") },
      ws => {
        return oraPromise(
          client.activateWebSpotlight().withData({ root_type: { codename: ws.rootTypeCodename } }).toPromise(),
          { text: "Updating web spotlight" },
        );
      },
    )
    .exhaustive();
