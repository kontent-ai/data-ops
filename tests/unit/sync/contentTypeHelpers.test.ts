import { describe, expect, it } from "@jest/globals";
import { ContentTypeElements } from "@kontent-ai/management-sdk";

import { getRequiredIds } from "../../../src/modules/sync/utils/contentTypeHelpers";

const guidelinesRichText =
  "<p>Don't forget to use the default value. Also, check the default <a data-item-id=\"itemId1\">content Item</a> and check the <a data-item-id=\"itemId2\">showcase item</a></p>\n<figure data-asset-id=\"assetId3\"><img src=\"#\" data-asset-id=\"assetId3\"></figure>";

const assetElements: ContentTypeElements.IAssetElement[] = [
  {
    name: "testAsset",
    type: "asset",
  },
  {
    name: "testAsset1",
    type: "asset",
    default: {
      global: {
        value: [
          { id: "assetId1" },
          { id: "assetId2" },
        ],
      },
    },
  },
];

const linkedItemsElements: ContentTypeElements.ILinkedItemsElement[] = [
  {
    name: "testAsset",
    type: "modular_content",
  },
  {
    name: "testAsset1",
    type: "modular_content",
    default: {
      global: {
        value: [
          { id: "itemId1" },
          { id: "itemId2" },
        ],
      },
    },
  },
];

const contentType = {
  id: "id",
  name: "testType",
  codename: "test_type",
  last_modified: "date",
  elements: [
    {
      type: "guidelines",
      name: "guidelines",
      guidelines: guidelinesRichText,
    },
    ...linkedItemsElements,
    ...assetElements,
  ],
};

describe("getRequiredAssetsIds", () => {
  it("get asset ids from elements and guidelines rich text", () => {
    const ids = getRequiredIds(contentType);

    expect(ids.assetIds).toEqual(new Set(["assetId1", "assetId2", "assetId3"]));
    expect(ids.itemIds).toEqual(new Set(["itemId1", "itemId2"]));
  });
});
