import { describe, expect, it } from "@jest/globals";
import { ContentTypeElements } from "@kontent-ai/management-sdk";
import { nodeParse, transformToPortableText } from "@kontent-ai/rich-text-resolver";

import { getRequiredAssetsIds, getRequiredItemIds } from "../../../src/modules/sync/utils/contentTypeHelpers";

const guidelinesRichText =
  "<p>Don't forget to use the default value. Also, check the default <a data-item-id=\"itemId1\">content Item</a> and check the <a data-item-id=\"itemId2\">showcase item</a></p>\n<figure data-asset-id=\"assetId3\"><img src=\"#\" data-asset-id=\"assetId3\"></figure>";

describe("getRequiredAssetsIds", () => {
  it("get asset ids from elements and guidelines rich text", () => {
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

    const parsedGuidelines = transformToPortableText(nodeParse(guidelinesRichText));
    const assetIds = getRequiredAssetsIds(assetElements, [parsedGuidelines]);

    expect(assetIds).toEqual(new Set(["assetId1", "assetId2", "assetId3"]));
  });
});

describe("getRequiredItemIds", () => {
  it("get itemIds from elements and guidelines richtext", () => {
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

    const parsedGuidelines = transformToPortableText(nodeParse(guidelinesRichText));
    const itemIds = getRequiredItemIds(linkedItemsElements, [parsedGuidelines]);

    expect(itemIds).toEqual(new Set(["itemId1", "itemId2"]));
  });
});
