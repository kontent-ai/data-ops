import { describe, expect, it } from "vitest";

import { assetFoldersHandler } from "../../../../src/modules/sync/diff/assetFolder.js";
import type { AssetFolderSyncModel } from "../../../../src/modules/sync/types/syncModel.js";

const createFolder = (
  name: string,
  subFolders: ReadonlyArray<AssetFolderSyncModel> = [],
  codename = "",
): AssetFolderSyncModel => ({
  name,
  codename: codename || name,
  folders: [...subFolders],
});

describe("assetFolderHandler", () => {
  it("creates addInto operation for nested folders", () => {
    const source = [createFolder("root", [createFolder("folder1", [createFolder("folder2")])])];
    const target = [createFolder("root", [createFolder("folder1")])];

    const operations = assetFoldersHandler(source, target);

    expect(operations).toStrictEqual([
      {
        op: "addInto",
        path: "/codename:root/folders/codename:folder1/folders",
        value: createFolder("folder2"),
      },
    ]);
  });

  it("creates remove operation for nested folders", () => {
    const source = [createFolder("root", [createFolder("folder1")])];
    const target = [createFolder("root", [createFolder("folder1", [createFolder("folder2")])])];

    const operations = assetFoldersHandler(source, target);

    expect(operations).toStrictEqual([
      {
        op: "remove",
        path: "/codename:root/folders/codename:folder1/folders/codename:folder2",
        oldValue: createFolder("folder2"),
      },
    ]);
  });

  it("creates replace operation for rename in nested folders", () => {
    const source = [createFolder("root", [createFolder("folder 1", [], "fCodename")])];
    const target = [createFolder("root", [createFolder("folder 2", [], "fCodename")])];

    const operations = assetFoldersHandler(source, target);

    expect(operations).toStrictEqual([
      {
        op: "replace",
        path: "/codename:root/folders/codename:fCodename/name",
        value: "folder 1",
        oldValue: "folder 2",
      },
    ]);
  });
});
