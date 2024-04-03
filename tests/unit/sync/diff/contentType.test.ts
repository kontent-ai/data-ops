import { describe, expect, it } from "@jest/globals";

import { makeContentTypeHandler } from "../../../../src/modules/sync/diff/contentType";
import { ContentTypeSyncModel } from "../../../../src/modules/sync/types/fileContentModel";
import { removeSpaces } from "./utils";

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
        {
          name: "group 3",
          codename: "group3",
        },
      ],
      elements: [
        {
          type: "number",
          codename: "element_1",
          name: "number",
        },
        {
          type: "text",
          codename: "element_2",
          name: "text",
        },
        {
          type: "date_time",
          codename: "element_3",
          name: "date",
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
          name: "group 3",
          codename: "group3",
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
        },
        {
          type: "date_time",
          codename: "element_3",
          name: "date",
        },
        {
          type: "text",
          codename: "toDelete",
          name: "to delete",
        },
        {
          type: "text",
          codename: "element_2",
          name: "txt",
        },
      ],
    };

    const result = makeContentTypeHandler({
      targetItemsByCodenames: new Map(),
      targetAssetsByCodenames: new Map(),
    })(source, target);

    expect(result).toStrictEqual([
      {
        op: "replace",
        path: "/name",
        value: "new name",
        oldValue: "old name",
      },
      {
        op: "move",
        path: "/content_groups/codename:group1",
        before: { codename: "group2" },
      },
      {
        op: "move",
        path: "/content_groups/codename:group2",
        after: { codename: "group1" },
      },
      {
        op: "replace",
        path: "/content_groups/codename:group2/name",
        value: "group 2 with new name",
        oldValue: "group 2",
      },
      {
        op: "addInto",
        path: "/content_groups",
        value: {
          name: "group to be added",
          codename: "groupToBeAdded",
        },
        after: { codename: "group2" },
      },
      {
        op: "move",
        path: "/content_groups/codename:group3",
        after: { codename: "groupToBeAdded" },
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
        op: "replace",
        path: "/elements/codename:element_1/name",
        value: "number",
        oldValue: "num",
      },
      {
        op: "move",
        path: "/elements/codename:element_2",
        after: { codename: "element_1" },
      },
      {
        op: "replace",
        path: "/elements/codename:element_2/name",
        value: "text",
        oldValue: "txt",
      },
      {
        op: "move",
        path: "/elements/codename:element_3",
        after: { codename: "element_2" },
      },
      {
        op: "remove",
        path: "/elements/codename:toDelete",
        oldValue: {
          type: "text",
          codename: "toDelete",
          name: "to delete",
        },
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
          ? { ...op.value ?? {}, guidelines: removeSpaces(op.value.guidelines) }
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
