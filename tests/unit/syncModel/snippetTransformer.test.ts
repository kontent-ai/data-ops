import { ContentTypeSnippetContracts } from "@kontent-ai/management-sdk";
import { describe, expect, it } from "vitest";

import { LogOptions } from "../../../src/log.ts";
import { EnvironmentModel } from "../../../src/modules/sync/generateSyncModel.ts";
import { transformContentTypeSnippetsModel } from "../../../src/modules/sync/modelTransfomers/contentTypeSnippets.ts";

const logOptions: LogOptions = {
  logLevel: "none",
  verbose: false,
};

const snippets = [
  {
    id: "snippetId1",
    name: "snippet 1",
    codename: "snippet_1",
    elements: [
      {
        id: "textElementId1",
        codename: "text_codename1",
        name: "element 1",
        type: "text",
      },
      {
        id: "textElementId2",
        codename: "text_codename2",
        name: "element2 ",
        type: "text",
      },
    ],
    last_modified: "",
  },
] as const satisfies ReadonlyArray<ContentTypeSnippetContracts.IContentTypeSnippetContract>;

describe("content type snippet transfomers", () => {
  it("correctly transforms object", () => {
    const environmentModel: EnvironmentModel = {
      contentTypes: [],
      contentTypeSnippets: snippets,
      taxonomyGroups: [],
      assetFolders: [],
      collections: [],
      spaces: [],
      webSpotlight: {
        enabled: false,
        root_type: null,
      },
      languages: [],
      assets: [],
      items: [],
    };

    const expectedOutput = [
      {
        ...snippets[0],
        id: undefined,
        last_modified: undefined,
        external_id: undefined,
        elements: [
          {
            ...snippets[0].elements[0],
            id: undefined,
            external_id: undefined,
          },
          {
            ...snippets[0].elements[1],
            id: undefined,
            external_id: undefined,
          },
        ],
      },
    ];

    const transformedSnippet = transformContentTypeSnippetsModel(environmentModel, logOptions);

    expect(transformedSnippet).toEqual(expectedOutput);
  });
});
