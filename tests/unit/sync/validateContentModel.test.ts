import { describe, expect, it } from "@jest/globals";

import { FileContentModel } from "../../../src/modules/sync/types/fileContentModel";
import { validateContentModel } from "../../../src/modules/sync/validation";

const sourceContentModel = {
  contentTypes: [
    {
      name: "contentType1",
      codename: "content_type_1",
      elements: [],
    },
    {
      name: "contentType2",
      codename: "content_type_2",
      external_id: "content_type_ext_id_2",
      elements: [],
    },
  ],
  contentTypeSnippets: [],
  taxonomyGroups: [
    {
      name: "group1",
      codename: "group1_codename",
      terms: [{
        name: "term1",
        codename: "term1_codename",
        terms: [{
          name: "term2",
          codename: "term2_codename",
          external_id: "term_2_extId",
          terms: [],
        }],
      }],
    },
    {
      name: "group2",
      codename: "group2_codename",
      terms: [{
        name: "term3",
        codename: "term3_codename",
        terms: [],
      }, {
        name: "term4",
        codename: "term4_codename",
        terms: [],
      }],
    },
  ],
} as const satisfies FileContentModel;

describe("validate content model", () => {
  it("validationModel returns array of errors", () => {
    const targetContentModel: FileContentModel = {
      ...sourceContentModel,
      contentTypes: [
        {
          ...sourceContentModel.contentTypes[0],
          external_id: sourceContentModel.contentTypes[1].external_id,
        },
      ],
      taxonomyGroups: [
        {
          ...sourceContentModel.taxonomyGroups[1],
          terms: [
            {
              ...sourceContentModel.taxonomyGroups[1].terms[0],
              external_id: sourceContentModel.taxonomyGroups[0].terms[0].terms[0].external_id,
            },
          ],
        },
      ],
    };

    const validationErrors = validateContentModel(targetContentModel, sourceContentModel, {});

    expect(validationErrors).toHaveLength(2);
  });
});
