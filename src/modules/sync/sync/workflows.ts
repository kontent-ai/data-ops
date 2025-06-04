import type { ManagementClient, WorkflowModels } from "@kontent-ai/management-sdk";

import { type LogOptions, logInfo } from "../../../log.js";
import { throwError } from "../../../utils/error.js";
import { serially } from "../../../utils/requests.js";
import type { DiffModel } from "../types/diffModel.js";

export const syncWorkflows = async (
  client: ManagementClient,
  operations: DiffModel["workflows"],
  logOptions: LogOptions,
) => {
  if (operations.added.length) {
    logInfo(logOptions, "standard", "Adding workflows");
    await serially(operations.added.map((w) => () => addWorkflow(client, w)));
  } else {
    logInfo(logOptions, "standard", "No workflows to add");
  }

  const workflowCodenamesToUpdate = [...operations.updated.entries()]
    .filter(([, arr]) => arr.length)
    .map(([codename]) => codename);

  if (workflowCodenamesToUpdate.length) {
    logInfo(logOptions, "standard", "Updating workflows");

    await serially(
      workflowCodenamesToUpdate.map((codename) => () => {
        const sourceWorkflow =
          operations.sourceWorkflows.find((w) => w.codename === codename) ??
          throwError(`Workflow { codename: ${codename} } not found.`);

        return modifyWorkflow(client, codename, sourceWorkflow);
      }),
    );
  } else {
    logInfo(logOptions, "standard", "No workflows to update");
  }

  if (operations.deleted.size) {
    logInfo(logOptions, "standard", "Deleting workflows");
    await serially(
      [...operations.deleted].map((codename) => () => deleteWorkflow(client, codename)),
    );
  } else {
    logInfo(logOptions, "standard", "No workflows to delete");
  }
};

const addWorkflow = (client: ManagementClient, workflow: WorkflowModels.IAddWorkflowData) =>
  client.addWorkflow().withData(workflow).toPromise();

const modifyWorkflow = (
  client: ManagementClient,
  codename: string,
  workflow: WorkflowModels.IUpdateWorkflowData,
) => client.updateWorkflow().byWorkflowCodename(codename).withData(workflow).toPromise();

const deleteWorkflow = (client: ManagementClient, codename: string) =>
  client.deleteWorkflow().byWorkflowCodename(codename).toPromise();
