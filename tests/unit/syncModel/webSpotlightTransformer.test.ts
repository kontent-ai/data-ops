import { ContentTypeContracts } from "@kontent-ai/management-sdk";
import { describe, expect, it } from "vitest";

import { transformWebSpotlightModel } from "../../../src/modules/sync/modelTransfomers/webSpotlight.ts";

const contentTypes = [
  {
    id: "typeId1",
    name: "type 1",
    codename: "type_codename_1",
    elements: [],
    last_modified: "",
  },
] as const satisfies ReadonlyArray<ContentTypeContracts.IContentTypeContract>;

const createEnvironmentModel = (isWebSpotlightEnabled: boolean, rootTypeId: string | null) => ({
  contentTypes,
  contentTypeSnippets: [],
  taxonomyGroups: [],
  assetFolders: [],
  collections: [],
  spaces: [],
  webSpotlight: {
    enabled: isWebSpotlightEnabled,
    root_type: rootTypeId ? { id: rootTypeId } : null,
  },
  assets: [],
  items: [],
});

describe("web spotlight transfomers", () => {
  it("correctly transforms disabled web spotlight", () => {
    const environmentModel = createEnvironmentModel(false, null);
    const expectedOutput = { enabled: false, root_type: null };

    const result = transformWebSpotlightModel(environmentModel);

    expect(result).toStrictEqual(expectedOutput);
  });

  it("correctly transforms enabled web spotlight with existing root type", () => {
    const environmentModel = createEnvironmentModel(true, "typeId1");
    const expectedOutput = { enabled: true, root_type: { codename: "type_codename_1" } };

    const result = transformWebSpotlightModel(environmentModel);

    expect(result).toStrictEqual(expectedOutput);
  });

  it("correctly transforms enabled web spotlight with non-existing root type", () => {
    const environmentModel = createEnvironmentModel(true, "nonExistingId");
    const expectedOutput = { enabled: true, root_type: null };

    const result = transformWebSpotlightModel(environmentModel);

    expect(result).toStrictEqual(expectedOutput);
  });

  it("correctly transforms disabled web spotlight with existing root type", () => {
    const environmentModel = createEnvironmentModel(false, "typeId1");
    const expectedOutput = { enabled: false, root_type: { codename: "type_codename_1" } };

    const result = transformWebSpotlightModel(environmentModel);

    expect(result).toStrictEqual(expectedOutput);
  });
});
