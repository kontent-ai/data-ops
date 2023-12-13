import { ManagementClient, WorkflowContracts, WorkflowModels } from "@kontent-ai/management-sdk";

import { emptyId } from "../../../constants/ids.js";
import { zip } from "../../../utils/array.js";
import { serially } from "../../../utils/requests.js";
import { EntityDefinition, ImportContext } from "../entityDefinition.js";

const defaultWorkflowId = emptyId;

export const workflowsEntity: EntityDefinition<WorkflowContracts.IListWorkflowsResponseContract> = {
  name: "workflows",
  fetchEntities: client => client.listWorkflows().toPromise().then(res => res.rawData),
  serializeEntities: collections => JSON.stringify(collections),
  deserializeEntities: JSON.parse,
  importEntities: async (client, importWfs, context) => {
    const oldProjectDefaultWf = await client.listWorkflows().toPromise()
      .then(res => res.data.find(w => w.id === defaultWorkflowId));
    const importDefaultWf = importWfs.find(w => w.id === defaultWorkflowId);

    if (!importDefaultWf || !oldProjectDefaultWf) {
      throw new Error(`The default workflow is missing in the imported file or the project to import into.`);
    }

    const projectDefaultWf = await updateWorkflow(client, oldProjectDefaultWf, importDefaultWf, context);
    const newProjectWfs = await addWorkflows(client, importWfs, context);

    const newDefaultWfStepIdEntries = zip(extractAllStepIds(importDefaultWf), extractAllStepIds(projectDefaultWf));

    return {
      ...context,
      workflowIdsByOldIds: new Map([...newProjectWfs.workflows, [defaultWorkflowId, defaultWorkflowId]]),
      worfklowStepsIdsByOldIds: new Map([...newProjectWfs.workflowSteps, ...newDefaultWfStepIdEntries]),
    };
  },
};

const createWorkflowData = (importWorkflow: WorkflowContracts.IWorkflowContract, context: ImportContext) => ({
  ...importWorkflow,
  scopes: importWorkflow.scopes.map(scope => ({
    content_types: scope.content_types
      .map(type => ({ id: context.contentTypeIdsWithElementsByOldIds.get(type.id ?? "")?.selfId })),
    collections: scope.collections.map(collection => ({ id: context.collectionIdsByOldIds.get(collection.id ?? "") })),
  })),
  steps: importWorkflow.steps.map(step => ({
    ...step,
    role_ids: [],
    transitions_to: step.transitions_to.map(transition => {
      const transitionWorkflow = extractAllSteps(importWorkflow).find(s => s.id === transition.step.id);

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
  context: ImportContext,
) =>
  client
    .updateWorkflow()
    .byWorkflowId(projectWorkflow.id)
    .withData(createWorkflowData(importWorkflow, context))
    .toPromise()
    .then(res => res.rawData);

const addWorkflows = async (
  client: ManagementClient,
  importWorkflows: WorkflowContracts.IListWorkflowsResponseContract,
  context: ImportContext,
) => {
  const responses = await serially(
    importWorkflows
      .filter(w => w.id !== defaultWorkflowId)
      .map(importWorkflow => async () => {
        const response = await client
          .addWorkflow()
          .withData(createWorkflowData(importWorkflow, context))
          .toPromise()
          .then(res => res.rawData);

        const stepsIds = zip(extractAllStepIds(importWorkflow), extractAllStepIds(response));

        return { workflow: [importWorkflow.id, response.id] as const, workflowSteps: stepsIds };
      }),
  );

  return responses
    .reduce<ContextWorkflowEntries>((prev, current) => ({
      workflows: prev.workflows.concat([current.workflow]),
      workflowSteps: prev.workflowSteps.concat(current.workflowSteps),
    }), { workflows: [], workflowSteps: [] });
};

type ContextWorkflowEntries = Readonly<{
  workflows: ReadonlyArray<readonly [string, string]>;
  workflowSteps: ReadonlyArray<readonly [string, string]>;
}>;

type AnyStep = Readonly<{ id: string; name: string; codename: string }>;
const extractAllSteps = (wf: WorkflowContracts.IWorkflowContract): ReadonlyArray<AnyStep> =>
  (wf.steps as AnyStep[]).concat([wf.scheduled_step, wf.published_step, wf.archived_step]);

const extractAllStepIds = (wf: WorkflowContracts.IWorkflowContract): ReadonlyArray<string> =>
  extractAllSteps(wf).map(s => s.id);
