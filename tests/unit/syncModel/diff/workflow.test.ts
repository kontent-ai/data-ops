import { describe, expect, it } from "vitest";

import { workflowHandler } from "../../../../src/modules/sync/diff/workflow.ts";
import { WorkflowSyncModel } from "../../../../src/modules/sync/types/syncModel.ts";

describe("workflowHandler", () => {
  it("creates a replace operation for every changed property", () => {
    const source: WorkflowSyncModel = {
      codename: "workflow_1",
      name: "workflow 1 renamed",
      scopes: [{
        content_types: [{
          codename: "type_1",
        }, {
          codename: "type_2",
        }],
        collections: [{
          codename: "collection_1",
        }],
      }, {
        content_types: [{
          codename: "type_3",
        }],
        collections: [{
          codename: "collection_2",
        }],
      }],
      steps: [{
        name: "step 1",
        codename: "step_1",
        color: "orange",
        transitions_to: [],
        role_ids: [],
      }, {
        name: "step 2",
        codename: "step_2",
        color: "gray",
        transitions_to: [{ step: { codename: "step_1" } }],
        role_ids: [],
      }],
      published_step: {
        name: "Published",
        codename: "Published",
        unpublish_role_ids: [],
        create_new_version_role_ids: [],
      },
      archived_step: {
        name: "Archived",
        codename: "archived",
        role_ids: [],
      },
    };

    const target: WorkflowSyncModel = {
      codename: "workflow_1",
      name: "workflow 1",
      scopes: [{
        content_types: [{
          codename: "type_1",
        }],
        collections: [{
          codename: "collection_1",
        }],
      }],
      steps: [{
        name: "step 1",
        codename: "step_1",
        color: "brown",
        transitions_to: [],
        role_ids: [],
      }],
      published_step: {
        name: "Published",
        codename: "Published",
        unpublish_role_ids: ["roleid"],
        create_new_version_role_ids: [],
      },
      archived_step: {
        name: "Archived",
        codename: "archived",
        role_ids: [],
      },
    };

    const result = workflowHandler(source, target);

    expect(result).toStrictEqual(
      [
        {
          oldValue: "workflow 1",
          op: "replace",
          path: "/name",
          value: "workflow 1 renamed",
        },
        {
          oldValue: "brown",
          op: "replace",
          path: "/steps/codename:step_1/color",
          value: "orange",
        },
        {
          op: "addInto",
          path: "/steps",
          value: {
            codename: "step_2",
            color: "gray",
            name: "step 2",
            role_ids: [],
            transitions_to: [
              {
                step: {
                  codename: "step_1",
                },
              },
            ],
          },
        },
      ],
    );
  });

  it("does not create any ops for identical workflows", () => {
    const source: WorkflowSyncModel = {
      codename: "workflow_1",
      name: "workflow 1",
      scopes: [{
        content_types: [{
          codename: "type_1",
        }],
        collections: [{
          codename: "collection_1",
        }],
      }],
      steps: [{
        name: "step 1",
        codename: "step_1",
        color: "brown",
        transitions_to: [],
        role_ids: [],
      }],
      published_step: {
        name: "Published",
        codename: "Published",
        unpublish_role_ids: ["roleid"],
        create_new_version_role_ids: [],
      },
      archived_step: {
        name: "Archived",
        codename: "archived",
        role_ids: [],
      },
    };

    const target = source;

    const result = workflowHandler(source, target);

    expect(result).toStrictEqual([]);
  });
});
