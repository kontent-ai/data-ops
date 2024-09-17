import { omit } from "../../../utils/object.js";
import { WorkflowSyncModel } from "../types/syncModel.js";
import { EnvironmentModel } from "../generateSyncModel.js";
import { throwError } from "../../../utils/error.js";

export const transformWorkflowModel = (
  environmentModel: EnvironmentModel,
): ReadonlyArray<WorkflowSyncModel> =>
  environmentModel.workflows.map(workflow => ({
    ...omit(workflow, ["id", "scheduled_step"]),
    steps: workflow.steps.map(step => ({
      ...omit(step, ["id"]),
      transitions_to: step.transitions_to.map(t => ({
        step: {
          codename:
            [...workflow.steps, workflow.published_step, workflow.archived_step].find(s => s.id === t.step.id)?.codename
              ?? throwError(
                `Cannot find workflow step { id: ${t.step.id} } for workflow { codename: ${workflow.codename} }.`,
              ),
        },
      })),
      role_ids: [], // all role references must be empty as roles cannot be synced yet
    })),
    scopes: workflow.scopes.map(scope => ({
      content_types: scope.content_types.map(scopeType => ({
        codename: environmentModel.contentTypes.find(type => type.id === scopeType.id)?.codename
          ?? throwError(
            `Cannot find content type { id: ${scopeType.id} } for the scope of workflow { codename: ${workflow.codename} }.`,
          ),
      })),
      collections: scope.collections.map(scopeCollection => ({
        codename: environmentModel.collections.find(collection => collection.id === scopeCollection.id)?.codename
          ?? throwError(
            `Cannot find collection { id: ${scopeCollection.id} } for the scope of workflow { codename: ${workflow.codename} }.`,
          ),
      })),
    })),
    published_step: {
      ...omit(workflow.published_step, ["id"]),
      unpublish_role_ids: [],
      create_new_version_role_ids: [],
    },
    archived_step: {
      ...omit(workflow.archived_step, ["id"]),
      role_ids: [],
    },
  }));
