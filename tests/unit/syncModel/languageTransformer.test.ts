import { LanguageContracts } from "@kontent-ai/management-sdk";
import { describe, expect, it } from "vitest";

import { transformLanguageModel } from "../../../src/modules/sync/modelTransfomers/language.js";

describe("transformLanguageModel", () => {
  it("correctly transforms languages", () => {
    const input = [
      {
        id: "1",
        name: "lang1",
        codename: "lang_1",
        fallback_language: {
          id: "1",
        },
        is_active: true,
        is_default: true,
      },
      {
        id: "2",
        name: "lang2",
        codename: "lang_2",
        fallback_language: {
          id: "1",
        },
        is_active: true,
        is_default: false,
      },
    ] as const satisfies LanguageContracts.ILanguageModelContract[];

    const transformedModel = transformLanguageModel(input);

    expect(transformedModel).toStrictEqual([
      {
        name: "lang1",
        codename: "lang_1",
        is_active: true,
        is_default: true,
      },
      {
        name: "lang2",
        fallback_language: {
          codename: "lang_1",
        },
        codename: "lang_2",
        is_active: true,
        is_default: false,
      },
    ]);
  });
});
