import { WorkflowStepSyncModel, WorkflowSyncModel } from "../types/syncModel.js";
import {
  baseHandler,
  constantHandler,
  Handler,
  makeArrayHandler,
  makeLeafObjectHandler,
  makeObjectHandler,
  makeWholeObjectsHandler,
} from "./combinators.js";

const workflowStepHandler: Handler<WorkflowStepSyncModel> = makeObjectHandler({
  name: baseHandler,
  color: baseHandler,
  transitions_to: makeArrayHandler(
    t => t.step.codename,
    makeObjectHandler({ step: makeLeafObjectHandler({ codename: (source, target) => source === target }) }),
  ),
  /**
   * all role-related arrays are transformed to empty, as roles cannot be
   * synced via MAPI right now. use of constantHandler is valid in this case.
   */
  role_ids: constantHandler,
});

export const workflowHandler: Handler<WorkflowSyncModel> = makeObjectHandler({
  name: baseHandler,
  steps: makeArrayHandler(s => s.codename, workflowStepHandler),
  published_step: makeObjectHandler({
    name: baseHandler,
    create_new_version_role_ids: constantHandler,
    unpublish_role_ids: constantHandler,
  }),
  archived_step: makeObjectHandler({
    name: baseHandler,
    role_ids: constantHandler,
  }),
  scopes: (sourceValue, targetValue) => {
    const scopeRefsHandler = makeObjectHandler({
      codename: baseHandler,
    });

    const emptyScope = {
      content_types: [],
      collections: [],
    };

    const contentTypesOps = sourceValue.flatMap((sourceScope, index) => {
      const targetScope = targetValue[index] || emptyScope;
      return scopeRefsHandler(sourceScope.content_types, targetScope.content_types);
    });

    const collectionsOps = sourceValue.flatMap((sourceScope, index) => {
      const targetScope = targetValue[index] || emptyScope;
      return scopeRefsHandler(sourceScope.collections, targetScope.collections);
    });

    return [...contentTypesOps, ...collectionsOps];
  },
});

export const wholeWorkflowsHandler: Handler<ReadonlyArray<WorkflowSyncModel>> = makeWholeObjectsHandler();
