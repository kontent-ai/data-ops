import { ManagementClient, WorkflowModels } from "@kontent-ai/management-sdk";
import { oraPromise } from "ora";

import { logInfo, LogOptions } from "../../../log.js";
import { throwError } from "../../../utils/error.js";
import { serially } from "../../../utils/requests.js";
import { noSyncTaskEmoji } from "../constants/emojiCodes.js";
import { DiffModel } from "../types/diffModel.js";

export const syncWorkflows = async (
  client: ManagementClient,
  operations: DiffModel["workflows"],
  logOptions: LogOptions,
) => {
  if (operations.added.length) {
    await oraPromise(serially(operations.added.map(w => () => addWorkflow(client, w))), { text: "Adding workflows" });
  } else {
    logInfo(logOptions, "standard", `${noSyncTaskEmoji} No workflows to add`);
  }

  if ([...operations.updated].flatMap(([, arr]) => arr).length) {
    await oraPromise(
      serially(
        [...operations.updated.keys()].map(codename => () =>
          modifyWorkflow(
            client,
            codename,
            operations.sourceWorkflows.find(w => w.codename === codename)
              ?? throwError(`Workflow { codename: ${codename} } not found.`),
          )
        ),
      ),
      { text: "Updating workflows" },
    );
  } else {
    logInfo(logOptions, "standard", `${noSyncTaskEmoji} No workflows to update`);
  }

  if (operations.deleted.size) {
    await oraPromise(
      serially(
        [...operations.deleted].map(codename => () => deleteWorkflow(client, codename)),
      ),
      { text: "Deleting workflows" },
    );
  } else {
    logInfo(logOptions, "standard", `${noSyncTaskEmoji} No workflows to delete`);
  }
};

const addWorkflow = (client: ManagementClient, workflow: WorkflowModels.IAddWorkflowData) =>
  client
    .addWorkflow()
    .withData(workflow)
    .toPromise();

const modifyWorkflow = (client: ManagementClient, codename: string, workflow: WorkflowModels.IUpdateWorkflowData) =>
  client
    .updateWorkflow()
    .byWorkflowCodename(codename)
    .withData(workflow)
    .toPromise();

const deleteWorkflow = (client: ManagementClient, codename: string) =>
  client
    .deleteWorkflow()
    .byWorkflowCodename(codename)
    .toPromise();
