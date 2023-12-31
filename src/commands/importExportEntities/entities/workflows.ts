import { ManagementClient, WorkflowContracts, WorkflowModels } from "@kontent-ai/management-sdk";

import { emptyId } from "../../../constants/ids.js";
import { zip } from "../../../utils/array.js";
import { serially } from "../../../utils/requests.js";
import { MapValues } from "../../../utils/types.js";
import { EntityDefinition, ImportContext } from "../entityDefinition.js";
import { createReference } from "./utils/referece.js";

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
      throw new Error("The default workflow is missing in the imported file or the project to import into.");
    }

    const projectDefaultWf = await updateWorkflow(client, oldProjectDefaultWf, importDefaultWf, context);
    const newProjectWfs = await addWorkflows(client, importWfs, context);

    const newDefaultWfStepIdEntries = extractStepIdEntriesWithContext(importDefaultWf, projectDefaultWf);
    const defaultWorkflowContext = {
      selfId: defaultWorkflowId,
      oldArchivedStepId: importDefaultWf.archived_step.id,
      oldScheduledStepId: importDefaultWf.scheduled_step.id,
      oldPublishedStepId: importDefaultWf.published_step.id,
      anyStepIdLeadingToPublishedStep: importDefaultWf.steps
        .find(s => s.transitions_to.find(t => t.step.id === importDefaultWf.published_step.id))?.id ?? "",
    };

    return {
      ...context,
      workflowIdsByOldIds: new Map([...newProjectWfs.workflows, [defaultWorkflowId, defaultWorkflowContext]]),
      worfklowStepsIdsWithTransitionsByOldIds: new Map([...newProjectWfs.workflowSteps, ...newDefaultWfStepIdEntries]),
    };
  },
};

const createWorkflowData = (importWorkflow: WorkflowContracts.IWorkflowContract, context: ImportContext) => ({
  ...importWorkflow,
  scopes: importWorkflow.scopes.map(scope => ({
    content_types: scope.content_types
      .map(type =>
        createReference({
          newId: context.contentTypeContextByOldIds.get(type.id ?? "")?.selfId,
          oldId: type.id,
          entityName: "type",
        })
      ),
    collections: scope.collections.map(collection =>
      createReference({
        newId: context.collectionIdsByOldIds.get(collection.id ?? ""),
        oldId: collection.id,
        entityName: "collection",
      })
    ),
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

        const workflowSteps = extractStepIdEntriesWithContext(importWorkflow, response);
        const workflowContext: MapValues<ImportContext["workflowIdsByOldIds"]> = {
          selfId: response.id,
          oldPublishedStepId: response.published_step.id,
          oldArchivedStepId: response.archived_step.id,
          oldScheduledStepId: response.scheduled_step.id,
          anyStepIdLeadingToPublishedStep:
            response.steps.find(s => s.transitions_to.find(t => t.step.id === response.published_step.id))?.id ?? "",
        };

        return { workflow: [importWorkflow.id, workflowContext] as const, workflowSteps };
      }),
  );

  return responses
    .reduce<ContextWorkflowEntries>((prev, current) => ({
      workflows: prev.workflows.concat([current.workflow]),
      workflowSteps: prev.workflowSteps.concat(current.workflowSteps),
    }), { workflows: [], workflowSteps: [] });
};

type ContextWorkflowEntries = Readonly<{
  workflows: ReadonlyArray<readonly [string, MapValues<ImportContext["workflowIdsByOldIds"]>]>;
  workflowSteps: ReadonlyArray<readonly [string, MapValues<ImportContext["worfklowStepsIdsWithTransitionsByOldIds"]>]>;
}>;

const extractStepIdEntriesWithContext = (
  importWorkflow: WorkflowContracts.IWorkflowContract,
  projectWorkflow: WorkflowContracts.IWorkflowContract,
) =>
  zip(extractAllSteps(importWorkflow), extractAllStepIds(projectWorkflow))
    .map(([oldStep, newStepId]) =>
      [oldStep.id, {
        selfId: newStepId,
        oldTransitionIds: oldStep.transitions_to.map(t => t.step.id ?? ""),
      }] as const
    );

type AnyStep = Readonly<
  { id: string; name: string; codename: string; transitions_to: WorkflowContracts.IWorkflowStepTransitionsToContract[] }
>;
const extractAllSteps = (wf: WorkflowContracts.IWorkflowContract): ReadonlyArray<AnyStep> =>
  (wf.steps as AnyStep[]).concat([
    setOnlyTransition(wf.scheduled_step, wf.archived_step.id),
    setOnlyTransition(wf.published_step, wf.archived_step.id),
    { ...wf.archived_step, transitions_to: [] },
  ]);

const setOnlyTransition = (step: Omit<AnyStep, "transitions_to">, transitionId: string): AnyStep => ({
  ...step,
  transitions_to: [{ step: { id: transitionId } }],
});

const extractAllStepIds = (wf: WorkflowContracts.IWorkflowContract): ReadonlyArray<string> =>
  extractAllSteps(wf).map(s => s.id);
