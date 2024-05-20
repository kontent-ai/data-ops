import { describe, expect, it } from "@jest/globals";
import { ContentTypeContracts } from "@kontent-ai/management-sdk";

import { LogOptions } from "../../../src/log";
import { transformContentTypeModel } from "../../../src/modules/sync/modelTransfomers/contentTypes";
import { ContentTypeWithUnionElements } from "../../../src/modules/sync/types/contractModels";

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
        external_id: contentTypes[0].codename,
        elements: [
          {
            ...contentTypes[0].elements[0],
            id: undefined,
            external_id: `${contentTypes[0].codename}__${contentTypes[0].elements[0].codename}`,
          },
          {
            ...contentTypes[0].elements[1],
            id: undefined,
            external_id: `${contentTypes[0].codename}__${contentTypes[0].elements[1].codename}`,
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
        external_id: contentTypes[0].codename,
        content_groups: [
          {
            ...inputContentTypes[0].content_groups[0],
            id: undefined,
            external_id: `${inputContentTypes[0].codename}_${inputContentTypes[0].content_groups[0].codename}`,
          },
          {
            ...inputContentTypes[0].content_groups[1],
            id: undefined,
            external_id: `${inputContentTypes[0].codename}_${inputContentTypes[0].content_groups[1].codename}`,
          },
        ],
        elements: [
          {
            ...contentTypes[0].elements[0],
            id: undefined,
            external_id: `${inputContentTypes[0].codename}_${inputContentTypes[0].content_groups[0].codename}_${
              contentTypes[0].elements[0].codename
            }`,
            content_group: { codename: inputContentTypes[0].content_groups[0].codename },
          },
          {
            ...contentTypes[0].elements[1],
            id: undefined,
            external_id: `${contentTypes[0].codename}_${inputContentTypes[0].content_groups[1].codename}_${
              contentTypes[0].elements[1].codename
            }`,
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
