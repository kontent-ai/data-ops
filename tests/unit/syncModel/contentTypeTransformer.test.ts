import { ContentTypeContracts } from "@kontent-ai/management-sdk";
import { describe, expect, it } from "vitest";

import { LogOptions } from "../../../src/log.ts";
import { transformContentTypeModel } from "../../../src/modules/sync/modelTransfomers/contentTypes.ts";
import { ContentTypeWithUnionElements } from "../../../src/modules/sync/types/contractModels.ts";

const logOptions: LogOptions = {
  logLevel: "none",
  verbose: false,
};

const contentTypes = [
  {
    id: "typeId1",
    name: "type 1",
    codename: "type_codename_1",
    elements: [
      {
        id: "textElementId1",
        codename: "text_codename1",
        name: "element 1",
        type: "text",
      },
      {
        id: "textElementId2",
        codename: "text_codename2",
        name: "element2 ",
        type: "text",
      },
    ],
    last_modified: "",
  },
] as const satisfies ReadonlyArray<ContentTypeContracts.IContentTypeContract>;

const createEnvironmentModel = (contentTypes: ReadonlyArray<ContentTypeWithUnionElements>) => ({
  contentTypes: contentTypes,
  contentTypeSnippets: [],
  taxonomyGroups: [],
  assetFolders: [],
  collections: [],
  webSpotlight: {
    enabled: false,
    root_type: null,
  },
  assets: [],
  items: [],
});

describe("content type transfomers", () => {
  it("correctly transforms object", () => {
    const environmentModel = createEnvironmentModel(contentTypes);

    const expectedOutput = [
      {
        ...contentTypes[0],
        id: undefined,
        last_modified: undefined,
        external_id: undefined,
        elements: [
          {
            ...contentTypes[0].elements[0],
            id: undefined,
            external_id: undefined,
          },
          {
            ...contentTypes[0].elements[1],
            id: undefined,
            external_id: undefined,
          },
        ],
      },
    ];

    const transformedContentType = transformContentTypeModel(environmentModel, logOptions);

    expect(transformedContentType).toEqual(expectedOutput);
  });

  it("correctly transforms object with content groups", () => {
    const inputContentTypes = [
      {
        ...contentTypes[0],
        elements: [
          {
            ...contentTypes[0].elements[0],
            content_group: { id: "contentGroupId1" },
          },
          {
            ...contentTypes[0].elements[1],
            content_group: { id: "contentGroupId2" },
          },
        ],
        content_groups: [
          {
            id: "contentGroupId1",
            name: "content group 1",
            codename: "content_group_codename_1",
          },
          {
            id: "contentGroupId2",
            name: "content group 2",
            codename: "content_group_codename_2",
          },
        ],
      },
    ] as const satisfies ReadonlyArray<ContentTypeWithUnionElements>;

    const expectedOutput = [
      {
        ...inputContentTypes[0],
        id: undefined,
        last_modified: undefined,
        external_id: undefined,
        content_groups: [
          {
            ...inputContentTypes[0].content_groups[0],
            id: undefined,
            external_id: undefined,
          },
          {
            ...inputContentTypes[0].content_groups[1],
            id: undefined,
            external_id: undefined,
          },
        ],
        elements: [
          {
            ...contentTypes[0].elements[0],
            id: undefined,
            external_id: undefined,
            content_group: { codename: inputContentTypes[0].content_groups[0].codename },
          },
          {
            ...contentTypes[0].elements[1],
            id: undefined,
            external_id: undefined,
            content_group: { codename: inputContentTypes[0].content_groups[1].codename },
          },
        ],
      },
    ];

    const environmentModel = createEnvironmentModel(inputContentTypes);

    const transformedContentType = transformContentTypeModel(environmentModel, logOptions);

    expect(transformedContentType).toEqual(expectedOutput);
  });
});
