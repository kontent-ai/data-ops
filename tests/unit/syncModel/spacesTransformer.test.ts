import { describe, expect, it } from "vitest";

import { EnvironmentModel } from "../../../src/modules/sync/generateSyncModel.ts";
import { transformSpacesModel } from "../../../src/modules/sync/modelTransfomers/spaceTransformers.ts";

describe("transformSpacesModel", () => {
  it("Replaces WS root item id and collection ids for codenames", () => {
    const environmentModel: EnvironmentModel = {
      spaces: [
        {
          id: "fd7e46fc-451f-47be-801a-f9c645fb6a39",
          name: "space1",
          codename: "space1",
          web_spotlight_root_item: { id: "cbf1bdb1-9399-47cf-8ab1-b6afab184f9c" },
          collections: [{ id: "6b3df4c1-fa0a-4da6-8231-9526d0c91dfc" }],
        },
      ],
      items: [{
        id: "cbf1bdb1-9399-47cf-8ab1-b6afab184f9c",
        name: "root item",
        codename: "rootItem",
        type: { id: "ad2d7314-19d8-43ca-a015-8b82e6f6f152" },
        collection: { id: "6b3df4c1-fa0a-4da6-8231-9526d0c91dfc" },
        spaces: [],
        last_modified: new Date(),
      }],
      collections: [{ id: "6b3df4c1-fa0a-4da6-8231-9526d0c91dfc", name: "collection", codename: "collection" }],
      webSpotlight: { enabled: false, root_type: null },
      taxonomyGroups: [],
      contentTypes: [],
      contentTypeSnippets: [],
      assetFolders: [],
      assets: [],
    };

    const result = transformSpacesModel(environmentModel);

    expect(result).toStrictEqual([
      {
        name: "space1",
        codename: "space1",
        web_spotlight_root_item: { codename: "rootItem" },
        collections: [{ codename: "collection" }],
      },
    ]);
  });
});
