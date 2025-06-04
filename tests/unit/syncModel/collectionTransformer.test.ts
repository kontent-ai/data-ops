import type { CollectionContracts } from "@kontent-ai/management-sdk";
import { describe, expect, it } from "vitest";

import { transformCollectionsModel } from "../../../src/modules/sync/modelTransfomers/collections.js";

describe("transformCollectionsModel", () => {
  const input = [
    {
      id: "id1",
      name: "collection1",
      codename: "collection_1",
    },
    {
      id: "id2",
      name: "collection2",
      codename: "collection_2",
    },
  ] as const satisfies ReadonlyArray<CollectionContracts.ICollectionContract>;

  it("transform collections correctly", () => {
    const expectedResult = [
      {
        name: "collection1",
        codename: "collection_1",
      },
      {
        name: "collection2",
        codename: "collection_2",
      },
    ];

    const result = transformCollectionsModel(input);

    expect(result).toStrictEqual(expectedResult);
  });
});
