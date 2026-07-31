import type { ManagementClient } from "@kontent-ai/management-sdk";
import { match } from "ts-pattern";

import { type LogOptions, logInfo } from "../../../log.js";
import type { LivePreviewDiffModel } from "../types/diffModel.js";

export const updateLivePreview = async (
  client: ManagementClient,
  diffModel: LivePreviewDiffModel,
  logOptions: LogOptions,
): Promise<unknown> =>
  match(diffModel)
    .with({ change: "none" }, async () => {
      logInfo(logOptions, "standard", "No live preview changes to perform");
      return await Promise.resolve();
    })
    .with({ change: "update" }, async (lp) => {
      logInfo(logOptions, "standard", `Updating live preview status to ${lp.status}`);
      return await client
        .changeLivePreviewConfiguration()
        .withData({ status: lp.status })
        .toPromise();
    })
    .exhaustive();
