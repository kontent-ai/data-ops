import { ManagementClient, WorkflowModels } from "@kontent-ai/management-sdk";

import { logInfo, LogOptions } from "../../../log.js";
import { throwError } from "../../../utils/error.js";
import { serially } from "../../../utils/requests.js";
import { DiffModel } from "../types/diffModel.js";

export const syncWorkflows = async (
  client: ManagementClient,
  operations: DiffModel["workflows"],
  logOptions: LogOptions,
) => {
  logInfo(logOptions, "standard", "Adding Workflows");

  await serially(operations.added.map(w => () => addWorkflow(client, w)));

  logInfo(logOptions, "standard", "Updating Workflows");

  await serially(
    [...operations.updated.keys()].map(codename => () =>
      modifyWorkflow(
        client,
        codename,
        operations.sourceWorkflows.find(w => w.codename === codename)
          ?? throwError(`Workflow { codename: ${codename} } not found.`),
      )
    ),
  );

  logInfo(logOptions, "standard", "Deleting Workflows");
  await serially(
    [...operations.deleted].map(codename => () => deleteWorkflow(client, codename)),
  );
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
