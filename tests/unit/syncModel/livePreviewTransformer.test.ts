import { describe, expect, it } from "vitest";

import { transformLivePreviewModel } from "../../../src/modules/sync/modelTransfomers/livePreview.ts";

const createEnvironmentModel = (status: string) => ({
  contentTypes: [],
  contentTypeSnippets: [],
  taxonomyGroups: [],
  assetFolders: [],
  collections: [],
  spaces: [],
  livePreview: { status },
  languages: [],
  assets: [],
  items: [],
  workflows: [],
});

describe("live preview transformers", () => {
  it("passes through the disabled status", () => {
    const result = transformLivePreviewModel(createEnvironmentModel("disabled"));

    expect(result).toStrictEqual({ status: "disabled" });
  });

  it("passes through the enabled status", () => {
    const result = transformLivePreviewModel(createEnvironmentModel("enabled"));

    expect(result).toStrictEqual({ status: "enabled" });
  });
});
