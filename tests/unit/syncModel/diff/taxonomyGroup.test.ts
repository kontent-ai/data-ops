import { describe, expect, it } from "vitest";

import { taxonomyGroupHandler } from "../../../../src/modules/sync/diff/taxonomy.ts";
import type { TaxonomySyncModel } from "../../../../src/modules/sync/types/syncModel.ts";

const makeTerm = (name: string): TaxonomySyncModel => ({
  name,
  codename: name.replaceAll(" ", ""),
  terms: [],
});

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
          ...makeTerm("term2"),
          terms: [makeTerm("New Term")],
        },
      ],
    };
    const target: TaxonomySyncModel = {
      name: "Old group name",
      codename: "taxonomy_group",
      terms: [
        {
          ...makeTerm("term2"),
          terms: [makeTerm("Term To Delete")],
        },
        {
          name: "Old term name",
          codename: "term1",
          terms: [],
        },
      ],
    };

    const result = taxonomyGroupHandler(source, target);

    expect(result).toStrictEqual([
      {
        op: "replace",
        path: "/name",
        value: "New group name",
        oldValue: "Old group name",
      },
      {
        op: "replace",
        path: "/terms/codename:term1/name",
        value: "New term name",
        oldValue: "Old term name",
      },
      {
        op: "addInto",
        path: "/terms/codename:term2/terms",
        value: {
          name: "New Term",
          codename: "NewTerm",
          terms: [],
        },
      },
      {
        op: "remove",
        path: "/terms/codename:term2/terms/codename:TermToDelete",
        oldValue: {
          name: "Term To Delete",
          codename: "TermToDelete",
          terms: [],
        },
      },
      {
        op: "move",
        path: "/terms/codename:term2",
        after: { codename: "term1" },
      },
    ]);
  });

  it("Creates move operation for a term moved under a different parent term", () => {
    const source: TaxonomySyncModel = {
      ...makeTerm("group"),
      terms: [
        {
          ...makeTerm("term1"),
          terms: [makeTerm("termA")],
        },
        makeTerm("term2"),
      ],
    };
    const target: TaxonomySyncModel = {
      ...makeTerm("group"),
      terms: [
        makeTerm("term1"),
        {
          ...makeTerm("term2"),
          terms: [makeTerm("termA")],
        },
      ],
    };

    const result = taxonomyGroupHandler(source, target);

    expect(result).toStrictEqual([
      {
        op: "move",
        path: "/terms/codename:term2/terms/codename:termA",
        under: { codename: "term1" },
      },
    ]);
  });

  it("Creates move operation for a term moved under the taxonomy group", () => {
    const source: TaxonomySyncModel = {
      ...makeTerm("group"),
      terms: [makeTerm("termA")],
    };
    const target: TaxonomySyncModel = {
      ...makeTerm("group"),
      terms: [
        {
          ...makeTerm("term1"),
          terms: [makeTerm("termA")],
        },
      ],
    };

    const result = taxonomyGroupHandler(source, target);

    expect(result).toStrictEqual([
      {
        op: "move",
        path: "/terms/codename:term1/terms/codename:termA",
        before: { codename: "term1" },
      },
      {
        op: "remove",
        path: "/terms/codename:term1",
        oldValue: { name: "term1", codename: "term1", terms: [] },
      },
    ]);
  });

  it("Creates move operation for a term moved under an added term", () => {
    const source: TaxonomySyncModel = {
      ...makeTerm("group"),
      terms: [
        {
          ...makeTerm("term1"),
          terms: [makeTerm("termA")],
        },
      ],
    };
    const target: TaxonomySyncModel = {
      ...makeTerm("group"),
      terms: [makeTerm("termA")],
    };

    const result = taxonomyGroupHandler(source, target);

    expect(result).toStrictEqual([
      { op: "addInto", path: "/terms", value: { name: "term1", codename: "term1", terms: [] } },
      { op: "move", path: "/terms/codename:termA", under: { codename: "term1" } },
    ]);
  });

  it("Creates move operation for a term moved from a deleted parent", () => {
    const source: TaxonomySyncModel = {
      ...makeTerm("group"),
      terms: [
        {
          ...makeTerm("term1"),
          terms: [makeTerm("termA")],
        },
      ],
    };
    const target: TaxonomySyncModel = {
      ...makeTerm("group"),
      terms: [
        makeTerm("term1"),
        {
          ...makeTerm("term2"),
          terms: [makeTerm("termA")],
        },
      ],
    };

    const result = taxonomyGroupHandler(source, target);

    expect(result).toStrictEqual([
      {
        op: "move",
        path: "/terms/codename:term2/terms/codename:termA",
        under: { codename: "term1" },
      },
      {
        op: "remove",
        path: "/terms/codename:term2",
        oldValue: { name: "term2", codename: "term2", terms: [] },
      },
    ]);
  });

  it("Creates sort operations for a term moved under a different parent", () => {
    const source: TaxonomySyncModel = {
      ...makeTerm("group"),
      terms: [
        {
          ...makeTerm("term1"),
          terms: [makeTerm("termA")],
        },
      ],
    };
    const target: TaxonomySyncModel = {
      ...makeTerm("group"),
      terms: [
        makeTerm("term1"),
        {
          ...makeTerm("term2"),
          terms: [makeTerm("termA")],
        },
      ],
    };

    const result = taxonomyGroupHandler(source, target);

    expect(result).toStrictEqual([
      {
        op: "move",
        path: "/terms/codename:term2/terms/codename:termA",
        under: { codename: "term1" },
      },
      {
        op: "remove",
        path: "/terms/codename:term2",
        oldValue: { name: "term2", codename: "term2", terms: [] },
      },
    ]);
  });
});
