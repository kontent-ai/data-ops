import { describe, expect, it } from "@jest/globals";

import {
  simplifyContext,
  transformReferences,
} from "../../../src/modules/importExport/importExportEntities/entities/utils/reference.ts";
import { ImportContext } from "../../../src/modules/importExport/importExportEntities/entityDefinition.ts";

const emptyMap = new Map();
const contextTemplate: Pick<ImportContext, "collectionIdsByOldIds" | "contentTypeSnippetContextByOldIds"> = {
  collectionIdsByOldIds: new Map([["oldId", "newId"]]),
  contentTypeSnippetContextByOldIds: new Map([
    [
      "oldId",
      {
        selfId: "selfId",
        elementIdsByOldIds: emptyMap,
        elementTypeByOldIds: emptyMap,
        multiChoiceOptionIdsByOldIdsByOldElementId: emptyMap,
      },
    ],
  ]),
};

describe("simplifyContext", () => {
  it("leaves string:string maps as-is", () => {
    const context: Pick<ImportContext, "collectionIdsByOldIds"> = {
      collectionIdsByOldIds: contextTemplate.collectionIdsByOldIds,
    };
    const actual = simplifyContext(context, ["collectionIdsByOldIds"]);
    const expected = context.collectionIdsByOldIds;

    expect(actual).toEqual(expected);
  });

  it("substitutes object in string:object pairs with selfId", () => {
    const context: Pick<ImportContext, "contentTypeSnippetContextByOldIds"> = {
      contentTypeSnippetContextByOldIds: contextTemplate.contentTypeSnippetContextByOldIds,
    };
    const actual = simplifyContext(context, ["contentTypeSnippetContextByOldIds"]);
    const expected = new Map([["oldId", "selfId"]]);

    expect(actual).toEqual(expected);
  });
});

describe("transformReferences", () => {
  it("substitutes all references based on context", () => {
    const simplifiedContext = simplifyContext(contextTemplate);
    const transformableObject = {
      transform: "oldId",
      ignore: "ignoredValue",
      nested: {
        transform: "oldId",
        ignore: "ignoredValue",
      },
    };
    const expected = {
      transform: "selfId",
      ignore: "ignoredValue",
      nested: {
        transform: "selfId",
        ignore: "ignoredValue",
      },
    };
    const actual = transformReferences(transformableObject, simplifiedContext);

    expect(actual).toEqual(expected);
  });
});
