import { zip } from "../../../utils/array.js";
import type { WorkflowStepSyncModel, WorkflowSyncModel } from "../types/syncModel.js";
import {
  baseHandler,
  constantHandler,
  type Handler,
  makeAdjustEntityHandler,
  makeArrayHandler,
  makeLeafObjectHandler,
  makeObjectHandler,
  makeWholeObjectsHandler,
} from "./combinators.js";

const workflowStepHandler: Handler<WorkflowStepSyncModel> = makeObjectHandler({
  name: baseHandler,
  color: baseHandler,
  transitions_to: makeArrayHandler(
    (t) => t.step.codename,
    makeObjectHandler({
      step: makeLeafObjectHandler({ codename: (source, target) => source === target }),
    }),
  ),
  /**
   * all role-related arrays are transformed to empty, as roles cannot be
   * synced via MAPI right now. use of constantHandler is valid in this case.
   */
  role_ids: constantHandler,
});

export const workflowHandler: Handler<WorkflowSyncModel> = makeObjectHandler({
  name: baseHandler,
  steps: makeArrayHandler((s) => s.codename, workflowStepHandler),
  published_step: makeObjectHandler({
    name: baseHandler,
    create_new_version_role_ids: constantHandler,
    unpublish_role_ids: constantHandler,
  }),
  archived_step: makeObjectHandler({
    name: baseHandler,
    role_ids: constantHandler,
  }),
  scopes: makeAdjustEntityHandler(
    (entity) => entity.map((e, index) => ({ ...e, index: index.toString() })),
    makeArrayHandler(
      (el) => el.index,
      makeLeafObjectHandler({
        content_types: (source, target) =>
          source.length === target.length &&
          zip(source, target).every(
            ([sourceValue, targetValue]) => sourceValue.codename === targetValue.codename,
          ),
        collections: (source, target) =>
          source.length === target.length &&
          zip(source, target).every(
            ([sourceValue, targetValue]) => sourceValue.codename === targetValue.codename,
          ),
      }),
    ),
  ),
});

export const wholeWorkflowsHandler: Handler<ReadonlyArray<WorkflowSyncModel>> =
  makeWholeObjectsHandler();
