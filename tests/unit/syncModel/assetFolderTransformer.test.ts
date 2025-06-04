import type { AssetFolderContracts } from "@kontent-ai/management-sdk";
import { describe, expect, it } from "vitest";

import { transformAssetFolderModel } from "../../../src/modules/sync/modelTransfomers/assetFolder.js";
import type { AssetFolderSyncModel } from "../../../src/modules/sync/types/syncModel.js";

describe("transformAssetFolderModel", () => {
  it("correctly transforms asset folder model to sync model with nested folders", () => {
    const input = {
      id: "01160b00-9d58-446d-bd13-5d9ceeb55d3c",
      name: "folderName",
      codename: "folderCodename",
      external_id: "externalId",
      folders: [
        {
          id: "fb10e7f9-929f-47e9-98e7-3dbc9828d6d9",
          name: "nestedFolder",
          codename: "nestedFolderCodename",
          external_id: "nestedExternalId",
          folders: [
            {
              id: "323d76f8-8808-4f98-b6f8-e997a1f4f7f9",
              name: "nestedNestedFolder",
              codename: "nestedNestedFolderCodename",
              external_id: "nestedNestedExternalId",
              folders: [],
            },
          ],
        },
      ],
    } as const satisfies AssetFolderContracts.IAssetFolderContract;

    const expectedOutput: AssetFolderSyncModel = {
      name: "folderName",
      codename: "folderCodename",
      folders: [
        {
          name: "nestedFolder",
          codename: "nestedFolderCodename",
          folders: [
            {
              name: "nestedNestedFolder",
              codename: "nestedNestedFolderCodename",
              folders: [],
            },
          ],
        },
      ],
    };

    const result = transformAssetFolderModel(input);

    expect(result).toStrictEqual(expectedOutput);
  });
});
