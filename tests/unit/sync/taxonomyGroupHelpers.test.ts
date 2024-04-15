import { describe, expect, it } from "@jest/globals";
import { TaxonomyContracts } from "@kontent-ai/management-sdk";

import { extractTerms } from "../../../src/modules/sync/utils/taxonomyGroupHelpers";

describe("extractTerms tests", () => {
  it("extractTerms correct extacts correctly", () => {
    const syncTaxonomyGroups = [
      {
        id: "groupId1",
        last_modified: "",
        name: "group1",
        codename: "group1_codename",
        terms: [{
          id: "termId1",
          last_modified: "",
          name: "term1",
          codename: "term1_codename",
          terms: [{
            id: "termId2",
            last_modified: "",
            name: "term2",
            codename: "term2_codename",
            terms: [],
          }],
        }],
      },
      {
        id: "groupId2",
        last_modified: "",
        name: "group2",
        codename: "group2_codename",
        terms: [{
          id: "termId3",
          last_modified: "",
          name: "term3",
          codename: "term3_codename",
          terms: [],
        }, {
          id: "termId4",
          last_modified: "",
          name: "term4",
          codename: "term4_codename",
          terms: [],
        }],
      },
    ] as const satisfies ReadonlyArray<TaxonomyContracts.ITaxonomyContract>;

    const resultTerms = [
      syncTaxonomyGroups[0].terms[0],
      syncTaxonomyGroups[0].terms[0].terms[0],
      syncTaxonomyGroups[1].terms[0],
      syncTaxonomyGroups[1].terms[1],
    ];

    const extractedTerms = extractTerms(syncTaxonomyGroups);

    expect(extractedTerms).toEqual(resultTerms);
  });
});
