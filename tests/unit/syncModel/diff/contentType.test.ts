import { describe, expect, it } from "vitest";

import { makeContentTypeHandler } from "../../../../src/modules/sync/diff/contentType.ts";
import { ContentTypeSyncModel } from "../../../../src/modules/sync/types/syncModel.ts";
import { removeSpaces } from "./utils.ts";

describe("makeContentTypeHandler", () => {
  it("creates operations for all changed properties", () => {
    const source: ContentTypeSyncModel = {
      name: "new name",
      codename: "type",
      content_groups: [
        {
          name: "group 1",
          codename: "group1",
        },
        {
          name: "group 2 with new name",
          codename: "group2",
        },
        {
          name: "group to be added",
          codename: "groupToBeAdded",
        },
      ],
      elements: [
        {
          type: "number",
          codename: "element_1",
          name: "number",
          content_group: { codename: "group1" },
        },
        {
          type: "text",
          codename: "element_2",
          name: "text",
          content_group: { codename: "group2" },
        },
        {
          type: "date_time",
          codename: "element_3",
          name: "date",
          content_group: { codename: "group1" },
        },
      ],
    };
    const target: ContentTypeSyncModel = {
      name: "old name",
      codename: "type",
      content_groups: [
        {
          name: "group 2",
          codename: "group2",
        },
        {
          name: "group to be deleted",
          codename: "groupToBeDeleted",
        },
        {
          name: "group 1",
          codename: "group1",
        },
      ],
      elements: [
        {
          type: "number",
          codename: "element_1",
          name: "num",
          content_group: { codename: "group1" },
        },
        {
          type: "date_time",
          codename: "element_3",
          name: "date",
          content_group: { codename: "group1" },
        },
        {
          type: "text",
          codename: "toDelete",
          name: "to delete",
          content_group: { codename: "group1" },
        },
        {
          type: "text",
          codename: "element_2",
          name: "txt",
          content_group: { codename: "group2" },
        },
      ],
    };

    const result = makeContentTypeHandler({
      targetItemsByCodenames: new Map(),
      targetAssetsByCodenames: new Map(),
    })(source, target);

    expect(result).toStrictEqual([
      {
        op: "addInto",
        path: "/content_groups",
        value: {
          name: "group to be added",
          codename: "groupToBeAdded",
        },
      },
      {
        op: "replace",
        path: "/name",
        value: "new name",
        oldValue: "old name",
      },
      {
        op: "replace",
        path: "/content_groups/codename:group2/name",
        value: "group 2 with new name",
        oldValue: "group 2",
      },
      {
        op: "replace",
        path: "/elements/codename:element_1/name",
        value: "number",
        oldValue: "num",
      },
      {
        op: "replace",
        path: "/elements/codename:element_2/name",
        value: "text",
        oldValue: "txt",
      },
      {
        op: "remove",
        path: "/elements/codename:toDelete",
        oldValue: {
          type: "text",
          codename: "toDelete",
          name: "to delete",
          content_group: { codename: "group1" },
        },
      },
      {
        op: "remove",
        path: "/content_groups/codename:groupToBeDeleted",
        oldValue: {
          name: "group to be deleted",
          codename: "groupToBeDeleted",
        },
      },
      {
        op: "move",
        path: "/content_groups/codename:group2",
        after: { codename: "group1" },
      },
      {
        op: "move",
        path: "/content_groups/codename:groupToBeAdded",
        after: { codename: "group2" },
      },
    ]);
  });

  it("Correctly replaces references when adding guidelines element", () => {
    const source: ContentTypeSyncModel = {
      name: "type",
      codename: "type",
      elements: [
        {
          type: "guidelines",
          codename: "guidelines",
          guidelines:
            `<p><a data-item-codename="item" data-item-external-id="itemE">item link</a>xyz <a data-asset-codename="asset1" data-asset-external-id="asset1E">asset link</a></p><figure data-asset-codename="asset2" data-asset-external-id="asset2E"><img src="#" data-asset-codename="asset2" data-asset-external-id="asset2E"/></figure><p><a data-asset-external-id="assetN">non-existing asset link</a></p>`,
        },
      ],
    };
    const target: ContentTypeSyncModel = {
      name: "type",
      codename: "type",
      elements: [],
    };

    const result = makeContentTypeHandler({
      targetItemsByCodenames: new Map([["item", { id: "itemId", codename: "item" }]]),
      targetAssetsByCodenames: new Map([
        ["asset1", { id: "asset1Id", codename: "asset1" }],
        ["asset2", { id: "asset2Id", codename: "asset2" }],
      ]),
    })(source, target);

    const resultWithFilteredSpaces = result
      .map(op => ({
        ...op,
        value: op.op === "addInto" && typeof op.value === "object" && op.value !== null && "guidelines" in op.value
            && typeof op.value.guidelines === "string"
          ? { ...op.value, guidelines: removeSpaces(op.value.guidelines) }
          : {},
      }));

    expect(resultWithFilteredSpaces).toStrictEqual([
      {
        op: "addInto",
        path: "/elements",
        value: {
          type: "guidelines",
          codename: "guidelines",
          guidelines: removeSpaces(
            `<p><a data-item-id="itemId">item link</a>xyz <a data-asset-id="asset1Id">asset link</a></p><figure data-asset-id="asset2Id"><img src="#" data-asset-id="asset2Id"/></figure><p><a data-asset-external-id="assetN">non-existing asset link</a></p>`,
          ),
        },
      },
    ]);
  });
});
