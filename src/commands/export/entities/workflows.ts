import { WorkflowContracts } from "@kontent-ai/management-sdk";

import { EntityDefinition } from "../entityDefinition.js";

export const workflowsExportEntity: EntityDefinition<WorkflowContracts.IListWorkflowsResponseContract> = {
    name: "workflows",
    fetchEntities: client => client.listWorkflows().toPromise().then(res => res.rawData),
    serializeEntities: collections => JSON.stringify(collections),
  };