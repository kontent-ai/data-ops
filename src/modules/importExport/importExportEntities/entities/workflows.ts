import { ManagementClient, WorkflowContracts, WorkflowModels } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { defaultCodename, defaultName, emptyId } from "../../../../constants/ids.js";
import { logInfo, LogOptions } from "../../../../log.js";
import { zip } from "../../../../utils/array.js";
import { serially } from "../../../../utils/requests.js";
import { notNullOrUndefined } from "../../../../utils/typeguards.js";
import { MapValues, ReplaceReferences } from "../../../../utils/types.js";
import { EntityDefinition, EntityImportDefinition, ImportContext } from "../entityDefinition.js";

const defaultWorkflowId = emptyId;

type Workflow = ReplaceReferences<WorkflowContracts.IWorkflowContract>;

export const workflowsEntity = {
  name: "workflows",
  displayName: "workflows",
  fetchEntities: client => client.listWorkflows().toPromise().then(res => res.rawData as ReadonlyArray<Workflow>),
  serializeEntities: JSON.stringify,
  deserializeEntities: JSON.parse,
  importEntities: async (client, importWfs, context, logOptions) => {
    const importWfsWithoutScopes = importWfs.map(wf => ({ ...wf, scopes: [] }));

    const oldProjectDefaultWf = await client.listWorkflows().toPromise()
      .then(res => res.data.find(w => w.id === defaultWorkflowId));
    const importDefaultWf = importWfsWithoutScopes.find(w => w.id === defaultWorkflowId);

    if (!importDefaultWf || !oldProjectDefaultWf) {
      throw new Error("The default workflow is missing in the imported file or the project to import into.");
    }

    logInfo(logOptions, "verbose", `Updating: default workflow (${chalk.yellow(importDefaultWf.name)})`);

    const projectDefaultWf = await updateWorkflow(client, oldProjectDefaultWf, importDefaultWf, context);
    const newProjectWfs = await addWorkflows(client, importWfsWithoutScopes, context, logOptions);

    const newDefaultWfStepIdEntries = extractStepIdEntriesWithContext(importDefaultWf, projectDefaultWf);

    const defaultWfDraftStep = importDefaultWf.steps[0];
    if (!defaultWfDraftStep) {
      throw new Error("The default workflow has no steps. This should never happen.");
    }

    const defaultWorkflowContext = {
      selfId: defaultWorkflowId,
      oldArchivedStepId: importDefaultWf.archived_step.id,
      oldScheduledStepId: importDefaultWf.scheduled_step.id,
      oldPublishedStepId: importDefaultWf.published_step.id,
      oldDraftStepId: defaultWfDraftStep.id,
      anyStepIdLeadingToPublishedStep: importDefaultWf.steps
        .find(s => s.transitions_to.find(t => t.step.id === importDefaultWf.published_step.id))?.id ?? "",
    };

    return {
      ...context,
      workflowIdsByOldIds: new Map([...newProjectWfs.workflows, [defaultWorkflowId, defaultWorkflowContext]]),
      workflowStepsIdsWithTransitionsByOldIds: new Map([...newProjectWfs.workflowSteps, ...newDefaultWfStepIdEntries]),
    };
  },
  cleanEntities: async (client, workflows) => {
    await serially(
      workflows.map((workflow) => () => {
        return workflow.id === defaultWorkflowId
          ? client
            .updateWorkflow()
            .byWorkflowId(workflow.id)
            .withData(createDefaultWorkflowData(workflow))
            .toPromise()
          : client
            .deleteWorkflow()
            .byWorkflowId(workflow.id)
            .toPromise();
      }),
    );
  },
} as const satisfies EntityDefinition<ReadonlyArray<Workflow>>;

export const importWorkflowScopesEntity = {
  name: workflowsEntity.name,
  displayName: "workflow scopes",
  deserializeEntities: JSON.parse,
  importEntities: async (client, importWfs, context, logOptions) => {
    const oldProjectWfs = await client.listWorkflows().toPromise().then(res => res.data);

    await serially(
      importWfs
        .filter(wf => !!wf.scopes.length)
        .map(wf => [wf, oldProjectWfs.find(w => w.codename === wf.codename)] as const)
        .filter(second(notNullOrUndefined))
        .map(([wf, importedWf]) => () => {
          logInfo(logOptions, "verbose", `Updating: workflow scopes of workflow ${wf.id} (${chalk.yellow(wf.name)})`);

          return updateWorkflow(client, importedWf, wf, context);
        }),
    );
  },
} as const satisfies EntityImportDefinition<ReadonlyArray<Workflow>>;

const createWorkflowData = (importWorkflow: Workflow, context: ImportContext) => ({
  ...importWorkflow,
  scopes: importWorkflow.scopes.map(scope => ({
    content_types: scope.content_types
      .filter(t => context.contentTypeContextByOldIds.get(t.id))
      .map(type => ({ id: context.contentTypeContextByOldIds.get(type.id)?.selfId })),
    collections: scope.collections
      .filter(c => context.collectionIdsByOldIds.get(c.id))
      .map(collection => ({ id: context.collectionIdsByOldIds.get(collection.id) })),
  })),
  steps: importWorkflow.steps.map(step => ({
    ...step,
    id: undefined,
    role_ids: [],
    transitions_to: step.transitions_to.map(transition => {
      const transitionWorkflow = extractAllSteps(importWorkflow).find(s => s.id === transition.step.id);

      if (!transitionWorkflow) {
        throw new Error(`Could not find workflow step with id ${transition.step.id}. This should never happen.`);
      }

      return { step: { codename: transitionWorkflow.codename } };
    }),
  })),
  published_step: {
    ...importWorkflow,
    id: undefined,
    unpublish_role_ids: [],
    create_new_version_role_ids: [],
  },
  archived_step: {
    ...importWorkflow.archived_step,
    id: undefined,
    role_ids: [],
  },
});

const updateWorkflow = async (
  client: ManagementClient,
  projectWorkflow: WorkflowModels.Workflow,
  importWorkflow: Workflow,
  context: ImportContext,
) =>
  client
    .updateWorkflow()
    .byWorkflowId(projectWorkflow.id)
    .withData(createWorkflowData(importWorkflow, context))
    .toPromise()
    .then(res => res.rawData as Workflow);

const addWorkflows = async (
  client: ManagementClient,
  importWorkflows: ReadonlyArray<Workflow>,
  context: ImportContext,
  logOptions: LogOptions,
) => {
  const responses = await serially(
    importWorkflows
      .filter(w => w.id !== defaultWorkflowId)
      .map(importWorkflow => async () => {
        logInfo(
          logOptions,
          "verbose",
          `Importing: workflow ${importWorkflow.id} (${chalk.yellow(importWorkflow.name)})`,
        );

        const response = await client
          .addWorkflow()
          .withData(createWorkflowData(importWorkflow, context))
          .toPromise()
          .then(res => res.rawData as Workflow);

        const workflowSteps = extractStepIdEntriesWithContext(importWorkflow, response);

        const draftStep = response.steps[0];
        if (!draftStep) {
          throw new Error(`Found workflow "${importWorkflow.id}" without any steps. This should never happen.`);
        }

        const workflowContext: MapValues<ImportContext["workflowIdsByOldIds"]> = {
          selfId: response.id,
          oldPublishedStepId: importWorkflow.published_step.id,
          oldArchivedStepId: importWorkflow.archived_step.id,
          oldScheduledStepId: importWorkflow.scheduled_step.id,
          oldDraftStepId: draftStep.id,
          anyStepIdLeadingToPublishedStep:
            importWorkflow.steps.find(s => s.transitions_to.find(t => t.step.id === response.published_step.id))?.id
              ?? "",
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
  workflowSteps: ReadonlyArray<readonly [string, MapValues<ImportContext["workflowStepsIdsWithTransitionsByOldIds"]>]>;
}>;

const extractStepIdEntriesWithContext = (
  importWorkflow: Workflow,
  projectWorkflow: Workflow,
) =>
  zip(extractAllSteps(importWorkflow), extractAllStepIds(projectWorkflow))
    .map(([oldStep, newStepId]) =>
      [oldStep.id, {
        selfId: newStepId,
        oldTransitionIds: oldStep.transitions_to.map(t => t.step.id),
      }] as const
    );

type AnyStep = Readonly<{
  id: string;
  name: string;
  codename: string;
  transitions_to: ReadonlyArray<ReplaceReferences<WorkflowContracts.IWorkflowStepTransitionsToContract>>;
}>;
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

const createDefaultWorkflowData = (wf: Workflow): WorkflowModels.IUpdateWorkflowData => ({
  name: defaultName,
  codename: defaultCodename,
  scopes: [],
  steps: [
    {
      name: "draft",
      codename: "draft",
      color: "red",
      role_ids: [],
      transitions_to: [{ step: { codename: "published" } }],
    },
  ],
  published_step: { ...wf.published_step, codename: "published", name: "Published" },
  archived_step: { ...wf.archived_step, codename: "archived", name: "Archived" },
});

const second = <Original, Guarded extends Original, First, Rest extends ReadonlyArray<unknown>>(
  guard: (value: Original) => value is Guarded,
) =>
(tuple: readonly [First, Original, ...Rest]): tuple is readonly [First, Guarded, ...Rest] => guard(tuple[1]);
