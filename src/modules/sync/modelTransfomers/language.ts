import { LanguageContracts } from "@kontent-ai/management-sdk";

import { omit } from "../../../utils/object.js";
import { LanguageSyncModel } from "../types/syncModel.js";

export const transformLanguageModel = (
  languages: ReadonlyArray<LanguageContracts.ILanguageModelContract>,
): ReadonlyArray<LanguageSyncModel> =>
  languages.map(language => {
    const fallbackLanguage = languages.find(l => l.id === language.fallback_language?.id);

    if (!language.is_default && !fallbackLanguage) {
      throw new Error(
        `Could not transform language with codename ${language.codename} because could not find fallback language with id ${language.fallback_language?.id}`,
      );
    }

    return {
      ...omit(language, ["id", "external_id", "fallback_language"]),
      ...!language.is_default && fallbackLanguage ? { fallback_language: { codename: fallbackLanguage.codename } } : {},
    };
  });
