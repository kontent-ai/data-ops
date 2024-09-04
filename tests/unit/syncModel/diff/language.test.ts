import { describe, expect, it } from "vitest";

import { diff, DiffParams } from "../../../../src/modules/sync/diff.js";
import { languageHandler } from "../../../../src/modules/sync/diff/language.js";
import { FileContentModel } from "../../../../src/modules/sync/types/fileContentModel.js";
import { PatchOperation } from "../../../../src/modules/sync/types/patchOperation.js";
import { LanguageSyncModel } from "../../../../src/modules/sync/types/syncModel.js";

describe("makeContentTypeHandler", () => {
  it("creates operations for all changed properties", () => {
    const source: LanguageSyncModel = {
      name: "new name",
      codename: "lang1",
      is_default: false,
      is_active: true,
      fallback_language: { codename: "1" },
    };
    const target: LanguageSyncModel = {
      name: "old name",
      codename: "lang1",
      is_default: false,
      is_active: false,
      fallback_language: { codename: "2" },
    };

    const result = languageHandler(source, target);

    expect(result).toStrictEqual([
      {
        op: "replace",
        path: "/name",
        value: "new name",
        oldValue: "old name",
      },
      {
        op: "replace",
        path: "/is_active",
        value: true,
        oldValue: false,
      },
      {
        op: "replace",
        path: "/fallback_language",
        value: { codename: "1" },
        oldValue: { codename: "2" },
      },
    ]);
  });

  it("correctly does not create operation for is_default property", () => {
    const source: LanguageSyncModel = {
      name: "lang1",
      codename: "lang1",
      is_default: false,
      is_active: true,
      fallback_language: { codename: "1" },
    };
    const target: LanguageSyncModel = {
      name: "lang1",
      codename: "lang1",
      is_default: true,
      is_active: true,
      fallback_language: { codename: "1" },
    };

    const result = languageHandler(source, target);

    expect(result).toStrictEqual([]);
  });
});

describe("diff function", () => {
  const createModel = (languages: ReadonlyArray<LanguageSyncModel>): FileContentModel => ({
    assetFolders: [],
    collections: [],
    contentTypes: [],
    contentTypeSnippets: [],
    languages,
    spaces: [],
    taxonomyGroups: [],
    webSpotlight: { enabled: false, root_type: { codename: "non-existing" } },
  });

  const createDiffParams = (sourceModel: FileContentModel, targetModel: FileContentModel): DiffParams => ({
    sourceEnvModel: sourceModel,
    targetEnvModel: targetModel,
    targetAssetsReferencedFromSourceByCodenames: new Map(),
    targetItemsReferencedFromSourceByCodenames: new Map(),
  });

  it("default language codename correctly changed", () => {
    const sourceModel = createModel([{
      name: "lang1",
      codename: "lang_1",
      fallback_language: { codename: "default" },
      is_active: true,
      is_default: false,
    }, {
      name: "default",
      codename: "default",
      is_active: true,
      is_default: true,
    }]);

    const targetModel = createModel([{
      name: "lang2",
      codename: "lang_1",
      fallback_language: { codename: "default_changed" },
      is_active: true,
      is_default: false,
    }, {
      name: "default",
      codename: "default_changed",
      is_active: true,
      is_default: true,
    }]);

    const result = diff(createDiffParams(sourceModel, targetModel));

    const expectedUpdatedLanguages = new Map<string, PatchOperation[]>([
      [
        "lang_1",
        [
          { op: "replace", path: "/name", value: "lang1", oldValue: "lang2" },
          {
            op: "replace",
            path: "/fallback_language",
            value: { codename: "default" },
            oldValue: { codename: "default_changed" },
          },
        ],
      ],
      ["default_changed", [{ op: "replace", path: "/codename", value: "default", oldValue: "default_changed" }]],
    ]);

    expect(result.languages.updated).toStrictEqual(expectedUpdatedLanguages);
  });
});
