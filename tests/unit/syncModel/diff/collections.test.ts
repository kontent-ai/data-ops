import { describe, expect, it } from "vitest";

import { collectionsHandler } from "../../../../src/modules/sync/diff/collection.js";

describe("collectionHandler", () => {
  it("returns operation to add new collection and correctly order them", () => {
    const source = [
      {
        name: "collection2",
        codename: "collection_2",
      },
      {
        name: "collection1",
        codename: "collection_1",
      },
    ];

    const target = [
      {
        name: "collection1",
        codename: "collection_1",
      },
    ];

    const patchOperations = collectionsHandler(source, target);

    expect(patchOperations).toStrictEqual([
      {
        op: "addInto",
        path: "",
        value: {
          codename: "collection_2",
          name: "collection2",
        },
      },
      {
        after: {
          codename: "collection_2",
        },
        op: "move",
        path: "/codename:collection_1",
      },
    ]);
  });

  it("returns operation for move", () => {
    const source = [
      {
        name: "collection1",
        codename: "collection_1",
      },
      {
        name: "collection2",
        codename: "collection_2",
      },
    ];

    const target = [
      {
        name: "collection2",
        codename: "collection_2",
      },
      {
        name: "collection1",
        codename: "collection_1",
      },
    ];

    const patchOperations = collectionsHandler(source, target);

    expect(patchOperations).toStrictEqual([
      {
        op: "move",
        path: "/codename:collection_2",
        after: {
          codename: "collection_1",
        },
      },
    ]);
  });

  it("returns operation to replace name", () => {
    const source = [
      {
        name: "collection1",
        codename: "collection_1",
      },
    ];

    const target = [
      {
        name: "collection2",
        codename: "collection_1",
      },
    ];

    const patchOperations = collectionsHandler(source, target);

    expect(patchOperations).toStrictEqual([
      {
        op: "replace",
        path: "/codename:collection_1/name",
        value: "collection1",
        oldValue: "collection2",
      },
    ]);
  });

  it("returns operation to remove collection", () => {
    const source = [
      {
        name: "collection1",
        codename: "collection_1",
      },
    ];

    const target = [
      {
        name: "collection2",
        codename: "collection_2",
      },
      {
        name: "collection1",
        codename: "collection_1",
      },
    ];

    const patchOperations = collectionsHandler(source, target);

    expect(patchOperations).toStrictEqual([
      {
        op: "remove",
        path: "/codename:collection_2",
        oldValue: {
          codename: "collection_2",
          name: "collection2",
        },
      },
    ]);
  });
});
