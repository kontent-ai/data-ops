import { ManagementClient, WorkflowContracts, WorkflowModels } from "@kontent-ai/management-sdk";

import { zip } from "../../../utils/array.js";
import { serially } from "../../../utils/requests.js";
import { EntityDefinition } from "../entityDefinition.js";

const defaultWorkflowId = "00000000-0000-0000-0000-000000000000";

export const workflowsEntity: EntityDefinition<WorkflowContracts.IListWorkflowsResponseContract> = {
  name: "workflows",
  fetchEntities: client => client.listWorkflows().toPromise().then(res => res.rawData),
  serializeEntities: collections => JSON.stringify(collections),
  deserializeEntities: JSON.parse,
  importEntities: async (client, entities, context) => {
    const projectWorkflows = await client.listWorkflows().toPromise().then(res => res.data);
    const projectDefaultWorkflow = projectWorkflows.find(w => w.id === defaultWorkflowId) as WorkflowModels.Workflow;
    const importDefaultWorkflow = entities.find(w => w.id === defaultWorkflowId) as WorkflowContracts.IWorkflowContract;

    await updateWorkflow(client, projectDefaultWorkflow, importDefaultWorkflow, entities, context);
    const newProjectWorkflows = await addWorkflows(client, entities, context);

    return {
      ...context,
      workflowIdsByOldIds: new Map(newProjectWorkflows.workflows),
      worfklowStepsIdsByOldIds: new Map(newProjectWorkflows.workflowSteps),
    };
  },
};

const createWorkflowData = (
  importWorkflow: WorkflowContracts.IWorkflowContract,
  importWorkflows: WorkflowContracts.IListWorkflowsResponseContract,
  context: any,
) => ({
  ...importWorkflow,
  scopes: importWorkflow.scopes.map(scope => ({
    content_types: scope.content_types.map(type => context.contenTypesIdsByOldIds.get(type.id)),
    collections: scope.collections.map(collection => context.collectionIdsByOldIds.get(collection.id)),
  })),
  steps: importWorkflow.steps.map(step => ({
    ...step,
    transitions_to: step.transitions_to.map(transition => {
      const transitionWorkflow = importWorkflows.find(t => t.id === transition.step.id);

      if (!transitionWorkflow) {
        throw new Error(`Could not find worklow step with id ${transition.step.id}. This should never happen.`);
      }

      return { step: { codename: transitionWorkflow.codename } };
    }),
  })),
  published_step: {
    ...importWorkflow,
    unpublish_role_ids: [],
    create_new_version_role_ids: [],
  },
  archived_step: {
    ...importWorkflow.archived_step,
    role_ids: [],
  },
});

const updateWorkflow = async (
  client: ManagementClient,
  projectWorkflow: WorkflowModels.Workflow,
  importWorkflow: WorkflowContracts.IWorkflowContract,
  importWorkflows: WorkflowContracts.IListWorkflowsResponseContract,
  context: any,
) =>
  client
    .updateWorkflow()
    .byWorkflowId(projectWorkflow.id)
    .withData(createWorkflowData(importWorkflow, importWorkflows, context))
    .toPromise();

const addWorkflows = async (
  client: ManagementClient,
  importWorkflows: WorkflowContracts.IListWorkflowsResponseContract,
  context: any,
) => {
  const responses = await serially(
    importWorkflows
      .filter(w => w.id !== defaultWorkflowId)
      .map(importWorkflow => async () => {
        const response = await client
          .addWorkflow()
          .withData(createWorkflowData(importWorkflow, importWorkflows, context))
          .toPromise()
          .then(res => res.data);

        const stepsIds = zip(response.steps, importWorkflow.steps)
          .map(([projectTaxonomy, importTaxonomy]) => [importTaxonomy.id, projectTaxonomy.id] as const)
          .concat([
            [importWorkflow.published_step.id, response.publishedStep.id] as const,
            [importWorkflow.archived_step.id, response.archivedStep.id] as const,
          ]);

        return Promise.resolve({ workflow: [importWorkflow.id, response.id] as const, workflowSteps: stepsIds });
      }),
  );

  return responses
    .reduce((prev, current) => ({
      workflows: prev.workflows.concat([current.workflow]),
      workflowSteps: prev.workflowSteps.concat(current.workflowSteps),
    }), { workflows: [] as (readonly [string, string])[], workflowSteps: [] as (readonly [string, string])[] });
};
