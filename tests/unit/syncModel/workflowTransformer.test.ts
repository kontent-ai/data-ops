import { CollectionContracts, ContentTypeContracts, WorkflowContracts } from "@kontent-ai/management-sdk";
import { describe, expect, it } from "vitest";

import { EnvironmentModel } from "../../../src/modules/sync/generateSyncModel.ts";
import { transformWorkflowModel } from "../../../src/modules/sync/modelTransfomers/workflow.ts";

describe("transformWorkflowModel", () => {
  it("transforms workflows correctly", () => {
    const contentTypes = [
      {
        id: "1cdb6e21-3330-4f0f-88cd-171098950e4f",
        name: "type 1",
        codename: "type_codename_1",
        elements: [
          {
            id: "6e72b773-ec9b-464c-90cd-4eda8b10c266",
            codename: "text_codename1",
            name: "element 1",
            type: "text",
          },
          {
            id: "45d12a44-42df-485d-94a0-7692bcbde8d9",
            codename: "text_codename2",
            name: "element2 ",
            type: "text",
          },
        ],
        last_modified: "",
      },
    ] as const satisfies ReadonlyArray<ContentTypeContracts.IContentTypeContract>;

    const workflows = [
      {
        id: "8e38928b-50b6-4e9e-ab53-af35d6fcfcb8",
        name: "My workflow",
        codename: "my_workflow",
        scopes: [
          {
            content_types: [
              {
                id: "1cdb6e21-3330-4f0f-88cd-171098950e4f",
              },
            ],
            collections: [
              {
                id: "6b3df4c1-fa0a-4da6-8231-9526d0c91dfc",
              },
            ],
          },
        ],
        steps: [
          {
            id: "b288d00b-f5cd-4afe-97fc-42b9264404f3",
            name: "Draft",
            codename: "draft",
            color: "red",
            transitions_to: [
              {
                step: {
                  id: "c199950d-99f0-4983-b711-6c4c91624b22",
                },
              },
              {
                step: {
                  id: "7a535a69-ad34-47f8-806a-def1fdf4d391",
                },
              },
            ],
            role_ids: [
              "e25d74b8-f81a-4faf-94b9-b0bf2b3802c6",
            ],
          },
        ],
        published_step: {
          id: "c199950d-99f0-4983-b711-6c4c91624b22",
          name: "Published",
          codename: "published",
          unpublish_role_ids: [
            "e25d74b8-f81a-4faf-94b9-b0bf2b3802c6",
          ],
          create_new_version_role_ids: [
            "e25d74b8-f81a-4faf-94b9-b0bf2b3802c6",
          ],
        },
        scheduled_step: {
          id: "9d2b0228-4d0d-4c23-8b49-01a698857709",
          name: "Scheduled",
          codename: "scheduled",
          create_new_version_role_ids: [],
          unpublish_role_ids: [],
        },
        archived_step: {
          id: "7a535a69-ad34-47f8-806a-def1fdf4d391",
          name: "Archived",
          codename: "archived",
          role_ids: [
            "e25d74b8-f81a-4faf-94b9-b0bf2b3802c6",
          ],
        },
      },
    ] as const satisfies ReadonlyArray<WorkflowContracts.IWorkflowContract>;

    const collections = [{
      id: "6b3df4c1-fa0a-4da6-8231-9526d0c91dfc",
      name: "collection",
      codename: "collection",
    }] as const satisfies ReadonlyArray<CollectionContracts.ICollectionContract>;

    const environmentModel: EnvironmentModel = {
      spaces: [],
      items: [],
      webSpotlight: { enabled: false, root_type: null },
      taxonomyGroups: [],
      languages: [],
      contentTypeSnippets: [],
      assetFolders: [],
      assets: [],
      contentTypes,
      workflows,
      collections,
    };

    const expectedOutput = [
      {
        archived_step: {
          codename: "archived",
          name: "Archived",
          role_ids: [],
        },
        codename: "my_workflow",
        name: "My workflow",
        published_step: {
          codename: "published",
          create_new_version_role_ids: [],
          name: "Published",
          unpublish_role_ids: [],
        },
        scopes: [
          {
            collections: [
              {
                codename: "collection",
              },
            ],
            content_types: [
              {
                codename: "type_codename_1",
              },
            ],
          },
        ],
        steps: [
          {
            codename: "draft",
            color: "red",
            name: "Draft",
            role_ids: [],
            transitions_to: [
              {
                step: {
                  codename: "published",
                },
              },
              {
                step: {
                  codename: "archived",
                },
              },
            ],
          },
        ],
      },
    ];

    const result = transformWorkflowModel(environmentModel);

    expect(result).toStrictEqual(expectedOutput);
  });
});
