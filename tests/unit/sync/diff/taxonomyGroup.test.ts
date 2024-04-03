import { describe, expect, it } from "@jest/globals";

import { makeTaxonomyGroupHandler } from "../../../../src/modules/sync/diff/taxonomy";
import { TaxonomySyncModel } from "../../../../src/modules/sync/types/fileContentModel";

describe("makeTaxonomyGroupHandler", () => {
  it("correctly create patch operations for taxonomy groups with nested terms", () => {
    const source: TaxonomySyncModel = {
      name: "New group name",
      codename: "taxonomy_group",
      terms: [
        {
          name: "New term name",
          codename: "term1",
          terms: [],
        },
        {
          name: "Term2",
          codename: "term2",
          terms: [
            {
              name: "New term",
              codename: "newTerm",
              terms: [],
            },
          ],
        },
      ],
    };
    const target: TaxonomySyncModel = {
      name: "Old group name",
      codename: "taxonomy_group",
      terms: [
        {
          name: "Term2",
          codename: "term2",
          terms: [
            {
              name: "Term to delete",
              codename: "termToDelete",
              terms: [],
            },
          ],
        },
        {
          name: "Old term name",
          codename: "term1",
          terms: [],
        },
      ],
    };

    const result = makeTaxonomyGroupHandler()(source, target);

    expect(result).toStrictEqual([
      {
        op: "replace",
        path: "/name",
        value: "New group name",
        oldValue: "Old group name",
      },
      {
        op: "move",
        path: "/terms/codename:term1",
        before: { codename: "term2" },
      },
      {
        op: "replace",
        path: "/terms/codename:term1/name",
        value: "New term name",
        oldValue: "Old term name",
      },
      {
        op: "move",
        path: "/terms/codename:term2",
        after: { codename: "term1" },
      },
      {
        op: "addInto",
        path: "/terms/codename:term2/terms",
        value: {
          name: "New term",
          codename: "newTerm",
          terms: [],
        },
        before: { codename: "termToDelete" },
      },
      {
        op: "remove",
        path: "/terms/codename:term2/terms/codename:termToDelete",
        oldValue: {
          name: "Term to delete",
          codename: "termToDelete",
          terms: [],
        },
      },
    ]);
  });
});
