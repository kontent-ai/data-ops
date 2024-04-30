import { describe, expect, it } from "@jest/globals";

import {
  simplifyContext,
  transformReferences,
} from "../../../src/commands/importExportEntities/entities/utils/reference";
import { ImportContext } from "../../../src/commands/importExportEntities/entityDefinition";

const emptyMap = new Map();
const contextTemplate: Partial<ImportContext> = {
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
    const context: Partial<ImportContext> = {
      collectionIdsByOldIds: contextTemplate.collectionIdsByOldIds,
    };
    const actual = simplifyContext(context);
    const expected = context;

    expect(actual).toEqual(expected);
  });

  it("substitutes object in string:object pairs with selfId", () => {
    const context: Partial<ImportContext> = {
      contentTypeSnippetContextByOldIds: contextTemplate.contentTypeSnippetContextByOldIds,
    };
    const actual = simplifyContext(context);
    const expected = {
      contentTypeSnippetContextByOldIds: new Map([["oldId", "selfId"]]),
    };

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
