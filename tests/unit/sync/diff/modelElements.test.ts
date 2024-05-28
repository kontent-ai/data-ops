import { describe, expect, it } from "@jest/globals";

import { makeAssetElementHandler, makeGuidelinesElementHandler } from "../../../../src/modules/sync/diff/modelElements";
import { PatchOperation } from "../../../../src/modules/sync/types/diffModel";
import {
  ContentTypeSnippetsSyncModel,
  ContentTypeSyncModel,
  SyncAssetElement,
  SyncGuidelinesElement,
} from "../../../../src/modules/sync/types/syncModel";
import { removeSpaces } from "./utils";

const basicType: ContentTypeSnippetsSyncModel = {
  name: "type",
  codename: "type",
  elements: [],
};

describe("makeAssetElementHandler", () => {
  it("creates operations for all changed properties", () => {
    const type: ContentTypeSyncModel = {
      ...basicType,
      content_groups: [
        {
          name: "group 1",
          codename: "group1",
        },
        {
          name: "group 2",
          codename: "group2",
        },
      ],
    };
    const source: SyncAssetElement = {
      name: "new name",
      codename: "asset",
      type: "asset",
      guidelines: "new guidelines",
      is_required: true,
      content_group: { codename: "group1" },
      is_non_localizable: true,
      asset_count_limit: undefined,
      image_width_limit: {
        value: 33,
        condition: "exactly",
      },
      maximum_file_size: 45,
      allowed_file_types: "adjustable",
      image_height_limit: {
        value: 34,
        condition: "at_most",
      },
    };
    const target: SyncAssetElement = {
      name: "old name",
      codename: "asset",
      type: "asset",
      guidelines: undefined,
      is_required: false,
      content_group: { codename: "group2" },
      is_non_localizable: undefined,
      asset_count_limit: {
        value: 44,
        condition: "at_least",
      },
      image_width_limit: undefined,
      maximum_file_size: 31,
      allowed_file_types: "any",
      image_height_limit: {
        value: 69,
        condition: "exactly",
      },
    };

    const result = makeAssetElementHandler({
      sourceTypeOrSnippet: type,
      targetTypeOrSnippet: type,
      targetAssetCodenames: new Set(),
    })(
      source,
      target,
    );

    expect(result).toStrictEqual([
      {
        op: "replace",
        path: "/name",
        value: "new name",
        oldValue: "old name",
      },
      {
        op: "replace",
        path: "/guidelines",
        value: "new guidelines",
        oldValue: null,
      },
      {
        op: "replace",
        path: "/is_required",
        value: true,
        oldValue: false,
      },
      {
        op: "replace",
        path: "/content_group",
        value: { codename: "group1" },
        oldValue: { codename: "group2" },
      },
      {
        op: "replace",
        path: "/is_non_localizable",
        value: true,
        oldValue: null,
      },
      {
        op: "replace",
        path: "/asset_count_limit",
        value: null,
        oldValue: {
          value: 44,
          condition: "at_least",
        },
      },
      {
        op: "replace",
        path: "/image_width_limit",
        value: {
          value: 33,
          condition: "exactly",
        },
        oldValue: null,
      },
      {
        op: "replace",
        path: "/maximum_file_size",
        value: 45,
        oldValue: 31,
      },
      {
        op: "replace",
        path: "/allowed_file_types",
        value: "adjustable",
        oldValue: "any",
      },
      {
        op: "replace",
        path: "/image_height_limit",
        value: {
          value: 34,
          condition: "at_most",
        },
        oldValue: {
          value: 69,
          condition: "exactly",
        },
      },
    ]);
  });

  it("creates operation to patch content_group when the target group doesn't exist", () => {
    const sourceType: ContentTypeSyncModel = {
      ...basicType,
      content_groups: [{ name: "group 1", codename: "group1" }],
    };
    const source: SyncAssetElement = {
      type: "asset",
      name: "asset",
      codename: "asset",
      content_group: { codename: "group1" },
    };
    const target: SyncAssetElement = {
      type: "asset",
      name: "asset",
      codename: "asset",
      content_group: { codename: "non-existent-group" },
    };

    const result = makeAssetElementHandler({
      sourceTypeOrSnippet: sourceType,
      targetTypeOrSnippet: basicType,
      targetAssetCodenames: new Set(),
    })(
      source,
      target,
    );

    expect(result).toStrictEqual([
      {
        op: "replace",
        path: "/content_group",
        value: { codename: "group1" },
        oldValue: { codename: "non-existent-group" },
      },
    ]);
  });
});

describe("makeGuidelinesElementHandler", () => {
  const sourceType: ContentTypeSnippetsSyncModel = { codename: "snip", name: "Snip", elements: [] };
  const targetType: ContentTypeSnippetsSyncModel = { codename: "snip", name: "Snip", elements: [] };
  const element: SyncGuidelinesElement = {
    codename: "el",
    guidelines: "",
    type: "guidelines",
  };

  describe("asset references", () => {
    [[true, true], [true, false], [false, true], [false, false]].forEach(([doesSourceExist, doesTargetExist]) => {
      it(`Doesn't create operations for the same guidelines with an asset ${doesSourceExist ? "" : "not "}existing in source and ${doesTargetExist ? "" : "not "}existing in target`, () => {
        const sourceCodenameTag = doesSourceExist ? "data-asset-codename=\"asset1\" " : "";
        const targetCodenameTag = doesTargetExist ? "data-asset-codename=\"asset1\" " : "";
        const source =
          `<p>abc<figure ${sourceCodenameTag}data-asset-external-id="asset1E"><img src="#" ${sourceCodenameTag}data-asset-external-id="asset1E"/></figure>xyz</p>`;
        const target =
          `<p>abc<figure ${targetCodenameTag}data-asset-external-id="asset1E"><img src="#" ${targetCodenameTag}data-asset-external-id="asset1E"/></figure>xyz</p>`;
        const knownAssets = new Map(
          doesTargetExist ? [["asset1", { id: "e89cb81a-fdea-46b5-86bb-0a0a46480146", codename: "asset1" }]] : [],
        );

        const result = makeGuidelinesElementHandler({
          targetAssetsByCodenames: knownAssets,
          targetItemsByCodenames: new Map(),
          targetTypeOrSnippet: targetType,
          sourceTypeOrSnippet: sourceType,
        })({ ...element, guidelines: source }, { ...element, guidelines: target });

        expect(result).toStrictEqual([]);
      });
    });

    it("Creates replace and uses assetId for asset existing in target", () => {
      const source =
        `<p>abc<figure data-asset-codename="asset2" data-asset-external-id="asset2E"><img src="#" data-asset-codename="asset2" data-asset-external-id="asset2E"/></figure>xyz</p>`;
      const target =
        `<p>abc<figure data-asset-codename="asset1" data-asset-external-id="asset1E"><img src="#" data-asset-codename="asset1" data-asset-external-id="asset1E"/></figure>xyz</p>`;
      const knownAssets = new Map([
        ["asset1", { id: "e89cb81a-fdea-46b5-86bb-0a0a46480146", codename: "asset1" }],
        ["asset2", { id: "391d6188-cc36-47d6-b4a9-09e4da4a54c1", codename: "asset2" }],
      ]);

      const result = makeGuidelinesElementHandler({
        targetAssetsByCodenames: knownAssets,
        targetItemsByCodenames: new Map(),
        targetTypeOrSnippet: targetType,
        sourceTypeOrSnippet: sourceType,
      })({ ...element, guidelines: source }, { ...element, guidelines: target });

      expect(removeSpacesInValues(result)).toStrictEqual(removeSpacesInValues([{
        op: "replace",
        path: "/guidelines",
        oldValue: target,
        value:
          `<p>abc<figure data-asset-id="391d6188-cc36-47d6-b4a9-09e4da4a54c1"><img src="#" data-asset-id="391d6188-cc36-47d6-b4a9-09e4da4a54c1"/></figure>xyz</p>`,
      }]));
    });

    it("Creates replace and uses assetExternalId for asset not existing in target", () => {
      const source =
        `<p>abc<figure data-asset-codename="asset2" data-asset-external-id="asset2E"><img src="#" data-asset-codename="asset2" data-asset-external-id="asset2E"/></figure>xyz</p>`;
      const target =
        `<p>abc<figure data-asset-codename="asset1" data-asset-external-id="asset1E"><img src="#" data-asset-codename="asset1" data-asset-external-id="asset1E"/></figure>xyz</p>`;
      const knownAssets = new Map([["asset1", { id: "e89cb81a-fdea-46b5-86bb-0a0a46480146", codename: "asset1" }]]);

      const result = makeGuidelinesElementHandler({
        targetAssetsByCodenames: knownAssets,
        targetItemsByCodenames: new Map(),
        targetTypeOrSnippet: targetType,
        sourceTypeOrSnippet: sourceType,
      })({ ...element, guidelines: source }, { ...element, guidelines: target });

      expect(removeSpacesInValues(result)).toStrictEqual(removeSpacesInValues([{
        op: "replace",
        path: "/guidelines",
        oldValue: target,
        value:
          `<p>abc<figure data-asset-external-id="asset2E"><img src="#" data-asset-external-id="asset2E"/></figure>xyz</p>`,
      }]));
    });

    it("Creates replace and uses assetId for asset not existing in source", () => {
      const source =
        `<p>abc<figure data-asset-external-id="asset2E"><img src="#" data-asset-external-id="asset2E"/></figure>xyz</p>`;
      const target =
        `<p>abc<figure data-asset-codename="asset1" data-asset-external-id="asset1E"><img src="#" data-asset-codename="asset1" data-asset-external-id="asset1E"/></figure>xyz</p>`;
      const knownAssets = new Map([["asset1", { id: "e89cb81a-fdea-46b5-86bb-0a0a46480146", codename: "asset1" }]]);

      const result = makeGuidelinesElementHandler({
        targetAssetsByCodenames: knownAssets,
        targetItemsByCodenames: new Map(),
        targetTypeOrSnippet: targetType,
        sourceTypeOrSnippet: sourceType,
      })({ ...element, guidelines: source }, { ...element, guidelines: target });

      expect(removeSpacesInValues(result)).toStrictEqual(removeSpacesInValues([{
        op: "replace",
        path: "/guidelines",
        oldValue: target,
        value:
          `<p>abc<figure data-asset-external-id="asset2E"><img src="#" data-asset-external-id="asset2E"/></figure>xyz</p>`,
      }]));
    });
  });

  describe("asset link references", () => {
    [[true, true], [true, false], [false, true], [false, false]].forEach(([doesSourceExist, doesTargetExist]) => {
      it(`Doesn't create operations for the same guidelines with link to an asset ${doesSourceExist ? "" : "not "}existing in source and ${doesTargetExist ? "" : "not "}existing in target`, () => {
        const sourceCodenameTag = doesSourceExist ? "data-asset-codename=\"asset1\" " : "";
        const targetCodenameTag = doesTargetExist ? "data-asset-codename=\"asset1\" " : "";
        const source = `<p>abc <a ${sourceCodenameTag}data-asset-external-id="asset1E">asset link</a>xyz</p>`;
        const target = `<p>abc <a ${targetCodenameTag}data-asset-external-id="asset1E">asset link</a>xyz</p>`;
        const knownAssets = new Map(
          doesTargetExist ? [["asset1", { id: "e89cb81a-fdea-46b5-86bb-0a0a46480146", codename: "asset1" }]] : [],
        );

        const result = makeGuidelinesElementHandler({
          targetAssetsByCodenames: knownAssets,
          targetItemsByCodenames: new Map(),
          targetTypeOrSnippet: targetType,
          sourceTypeOrSnippet: sourceType,
        })({ ...element, guidelines: source }, { ...element, guidelines: target });

        expect(result).toStrictEqual([]);
      });
    });

    it("Creates replace and uses assetId for asset link existing in target", () => {
      const source = `<p>abc<a data-asset-codename="asset2" data-asset-external-id="asset2E">asset link</a>xyz</p>`;
      const target = `<p>abc<a data-asset-codename="asset1" data-asset-external-id="asset1E">asset link</a>xyz</p>`;
      const knownAssets = new Map([
        ["asset1", { id: "e89cb81a-fdea-46b5-86bb-0a0a46480146", codename: "asset1" }],
        ["asset2", { id: "391d6188-cc36-47d6-b4a9-09e4da4a54c1", codename: "asset2" }],
      ]);

      const result = makeGuidelinesElementHandler({
        targetAssetsByCodenames: knownAssets,
        targetItemsByCodenames: new Map(),
        targetTypeOrSnippet: targetType,
        sourceTypeOrSnippet: sourceType,
      })({ ...element, guidelines: source }, { ...element, guidelines: target });

      expect(removeSpacesInValues(result)).toStrictEqual(removeSpacesInValues([{
        op: "replace",
        path: "/guidelines",
        oldValue: target,
        value: `<p>abc<a data-asset-id="391d6188-cc36-47d6-b4a9-09e4da4a54c1">asset link</a>xyz</p>`,
      }]));
    });

    it("Creates replace and uses assetExternalId for asset link not existing in target", () => {
      const source = `<p>abc<a data-asset-codename="asset2" data-asset-external-id="asset2E">asset link</a>xyz</p>`;
      const target = `<p>abc<a data-asset-codename="asset1" data-asset-external-id="asset1E">asset link</a>xyz</p>`;
      const knownAssets = new Map([["asset1", { id: "e89cb81a-fdea-46b5-86bb-0a0a46480146", codename: "asset1" }]]);

      const result = makeGuidelinesElementHandler({
        targetAssetsByCodenames: knownAssets,
        targetItemsByCodenames: new Map(),
        targetTypeOrSnippet: targetType,
        sourceTypeOrSnippet: sourceType,
      })({ ...element, guidelines: source }, { ...element, guidelines: target });

      expect(removeSpacesInValues(result)).toStrictEqual(removeSpacesInValues([{
        op: "replace",
        path: "/guidelines",
        oldValue: target,
        value: `<p>abc<a data-asset-external-id="asset2E">asset link</a>xyz</p>`,
      }]));
    });

    it("Creates replace and uses assetId for asset link not existing in source", () => {
      const source = `<p>abc<a data-asset-external-id="asset2E">asset link</a>xyz</p>`;
      const target = `<p>abc<a data-asset-codename="asset1" data-asset-external-id="asset1E">asset link</a>xyz</p>`;
      const knownAssets = new Map([["asset1", { id: "e89cb81a-fdea-46b5-86bb-0a0a46480146", codename: "asset1" }]]);

      const result = makeGuidelinesElementHandler({
        targetAssetsByCodenames: knownAssets,
        targetItemsByCodenames: new Map(),
        targetTypeOrSnippet: targetType,
        sourceTypeOrSnippet: sourceType,
      })({ ...element, guidelines: source }, { ...element, guidelines: target });

      expect(removeSpacesInValues(result)).toStrictEqual(removeSpacesInValues([{
        op: "replace",
        path: "/guidelines",
        oldValue: target,
        value: `<p>abc<a data-asset-external-id="asset2E">asset link</a>xyz</p>`,
      }]));
    });
  });

  describe("item link references", () => {
    [[true, true], [true, false], [false, true], [false, false]].forEach(([doesSourceExist, doesTargetExist]) => {
      it(`Doesn't create operations for the same guidelines with link to an item ${doesSourceExist ? "" : "not "}existing in source and ${doesTargetExist ? "" : "not "}existing in target`, () => {
        const sourceCodenameTag = doesSourceExist ? "data-item-codename=\"item1\" " : "";
        const targetCodenameTag = doesTargetExist ? "data-item-codename=\"item1\" " : "";
        const source = `<p>abc <a ${sourceCodenameTag}data-item-external-id="item1E">item link</a>xyz</p>`;
        const target = `<p>abc <a ${targetCodenameTag}data-item-external-id="item1E">item link</a>xyz</p>`;
        const knownItems = new Map(
          doesTargetExist ? [["item1", { id: "e89cb81a-fdea-46b5-86bb-0a0a46480146", codename: "item1" }]] : [],
        );

        const result = makeGuidelinesElementHandler({
          targetAssetsByCodenames: new Map(),
          targetItemsByCodenames: knownItems,
          targetTypeOrSnippet: targetType,
          sourceTypeOrSnippet: sourceType,
        })({ ...element, guidelines: source }, { ...element, guidelines: target });

        expect(result).toStrictEqual([]);
      });
    });

    it("Creates replace and uses itemId for item link existing in target", () => {
      const source = `<p>abc<a data-item-codename="item2" data-item-external-id="item2E">item link</a>xyz</p>`;
      const target = `<p>abc<a data-item-codename="item1" data-item-external-id="item1E">item link</a>xyz</p>`;
      const knownItems = new Map([
        ["item1", { id: "e89cb81a-fdea-46b5-86bb-0a0a46480146", codename: "item1" }],
        ["item2", { id: "391d6188-cc36-47d6-b4a9-09e4da4a54c1", codename: "item2" }],
      ]);

      const result = makeGuidelinesElementHandler({
        targetAssetsByCodenames: new Map(),
        targetItemsByCodenames: knownItems,
        targetTypeOrSnippet: targetType,
        sourceTypeOrSnippet: sourceType,
      })({ ...element, guidelines: source }, { ...element, guidelines: target });

      expect(removeSpacesInValues(result)).toStrictEqual(removeSpacesInValues([{
        op: "replace",
        path: "/guidelines",
        oldValue: target,
        value: `<p>abc<a data-item-id="391d6188-cc36-47d6-b4a9-09e4da4a54c1" >item link</a>xyz</p>`,
      }]));
    });

    it("Creates replace and uses itemExternalId for item link not existing in target", () => {
      const source = `<p>abc<a data-item-codename="item2" data-item-external-id="item2E">item link</a>xyz</p>`;
      const target = `<p>abc<a data-item-codename="item1" data-item-external-id="item1E">item link</a>xyz</p>`;
      const knownItems = new Map([["item1", { id: "e89cb81a-fdea-46b5-86bb-0a0a46480146", codename: "item1" }]]);

      const result = makeGuidelinesElementHandler({
        targetAssetsByCodenames: new Map(),
        targetItemsByCodenames: knownItems,
        targetTypeOrSnippet: targetType,
        sourceTypeOrSnippet: sourceType,
      })({ ...element, guidelines: source }, { ...element, guidelines: target });

      expect(removeSpacesInValues(result)).toStrictEqual(removeSpacesInValues([{
        op: "replace",
        path: "/guidelines",
        oldValue: target,
        value: `<p>abc<a data-item-external-id="item2E" >item link</a>xyz</p>`,
      }]));
    });

    it("Creates replace and uses itemId for item link not existing in source", () => {
      const source = `<p>abc<a data-item-external-id="item2E">item link</a>xyz</p>`;
      const target = `<p>abc<a data-item-codename="item1" data-item-external-id="item1E">item link</a>xyz</p>`;
      const knownItems = new Map([["item1", { id: "e89cb81a-fdea-46b5-86bb-0a0a46480146", codename: "item1" }]]);

      const result = makeGuidelinesElementHandler({
        targetAssetsByCodenames: new Map(),
        targetItemsByCodenames: knownItems,
        targetTypeOrSnippet: targetType,
        sourceTypeOrSnippet: sourceType,
      })({ ...element, guidelines: source }, { ...element, guidelines: target });

      expect(removeSpacesInValues(result)).toStrictEqual(removeSpacesInValues([{
        op: "replace",
        path: "/guidelines",
        oldValue: target,
        value: `<p>abc<a data-item-external-id="item2E">item link</a>xyz</p>`,
      }]));
    });

    it("Creates replace even with additional attributes and different order", () => {
      const source = `<p>abc<a data-item-codename="item1"  test="someOtherValue">item link</a>xyz</p>`;
      const target =
        `<p>abc<a data-item-external-id="item2E" otherTest="someOtherOldValue" data-item-codename="item2">item link</a>xyz</p>`;
      const knownItems = new Map([["item1", { id: "e89cb81a-fdea-46b5-86bb-0a0a46480146", codename: "item1" }]]);

      const result = makeGuidelinesElementHandler({
        targetAssetsByCodenames: new Map(),
        targetItemsByCodenames: knownItems,
        targetTypeOrSnippet: targetType,
        sourceTypeOrSnippet: sourceType,
      })({ ...element, guidelines: source }, { ...element, guidelines: target });

      expect(removeSpacesInValues(result)).toStrictEqual(removeSpacesInValues([{
        op: "replace",
        path: "/guidelines",
        oldValue: target,
        value:
          `<p>abc<a data-item-id="e89cb81a-fdea-46b5-86bb-0a0a46480146" test="someOtherValue">item link</a>xyz</p>`,
      }]));
    });
  });
});

const removeSpacesInValues = (ops: ReadonlyArray<PatchOperation>): ReadonlyArray<PatchOperation> =>
  ops.map(op =>
    "value" in op && typeof op.value === "string"
      ? { ...op, value: removeSpaces(op.value) }
      : op
  );
