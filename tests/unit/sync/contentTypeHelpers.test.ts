import { describe, expect, it } from "@jest/globals";
import { ContentTypeElements, ElementContracts } from "@kontent-ai/management-sdk";

import { getRequiredIds } from "../../../src/modules/sync/utils/contentTypeHelpers";

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

const createGuidelineElement = (guidelines: string) => ({
  type: "guidelines",
  name: "guidelines",
  guidelines,
});

const createContentType = (elements: ElementContracts.IContentTypeElementContract[]) => ({
  id: "id",
  name: "testType",
  codename: "test_type",
  last_modified: "date",
  elements,
});

describe("getRequiredItemOrAssetIds", () => {
  it("test asset id from links in guidelines", () => {
    const guidelines =
      "<p>Asset Links:</p>\n<ul>\n  <li><a data-asset-id=\"assetId1\">Asset Link1</a>\n    <ul>\n      <li><a data-asset-id=\"assetId2\">Asset Link 2</a></li>\n    </ul>\n  </li>\n  <li><a data-asset-id=\"assetId2\">Asset Link 2</a></li>\n</ul>";
    const contentType = createContentType([createGuidelineElement(guidelines)]);

    const ids = getRequiredIds(contentType);

    expect(ids.assetIds).toEqual(new Set(["assetId1", "assetId2"]));
    expect(ids.itemIds).toEqual(new Set([]));
  });

  it("test obtain asset ids from assets in guidelines ", () => {
    const guidelines =
      "<p>Assets:</p>\n<figure data-asset-id=\"assetId1\"><img src=\"#\" data-asset-id=\"assetId1\"></figure>\n<ul>\n  <li><br/></li>\n</ul>\n<figure data-asset-id=\"assetId2\"><img src=\"#\" data-asset-id=\"assetId2\"></figure>";
    const contentType = createContentType([createGuidelineElement(guidelines)]);

    const ids = getRequiredIds(contentType);

    expect(ids.assetIds).toEqual(new Set(["assetId1", "assetId2"]));
    expect(ids.itemIds).toEqual(new Set([]));
  });

  it("test obtain item ids from links in guidelines ", () => {
    const guidelines =
      "<p>Item links:</p>\n<p><a data-item-id=\"itemId1\">Item Link 1</a></p>\n<ul>\n  <li><a data-item-id=\"itemId2\">Item Link 2</a>\n    <ul>\n      <li><a data-item-id=\"itemId3\">Item Link 3</a></li>\n    </ul>\n  </li>\n</ul>";
    const contentType = createContentType([createGuidelineElement(guidelines)]);

    const ids = getRequiredIds(contentType);

    expect(ids.assetIds).toEqual(new Set([]));
    expect(ids.itemIds).toEqual(new Set(["itemId1", "itemId2", "itemId3"]));
  });

  it("test obtain assets and item ids from guidelines ", () => {
    const guidelines =
      "<p>Item links: <a data-item-id=\"itemId1\">Item Link 1</a></p>\n<p>Asset Link: <a data-asset-id=\"assetId1\">Asset Link 1</a></p>\n<figure data-asset-id=\"assetId1\"><img src=\"#\" data-asset-id=\"assetId1\"></figure>";
    const contentType = createContentType([createGuidelineElement(guidelines)]);

    const ids = getRequiredIds(contentType);

    expect(ids.assetIds).toEqual(new Set(["assetId1"]));
    expect(ids.itemIds).toEqual(new Set(["itemId1"]));
  });

  it("obtain ids from asset and linked elements ", () => {
    const contentType = createContentType([...linkedItemsElements, ...assetElements]);
    const ids = getRequiredIds(contentType);

    expect(ids.assetIds).toEqual(new Set(["assetId1", "assetId2"]));
    expect(ids.itemIds).toEqual(new Set(["itemId1", "itemId2"]));
  });
});
