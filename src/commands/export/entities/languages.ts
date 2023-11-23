import { LanguageContracts } from "@kontent-ai/management-sdk";

import { EntityDefinition } from "../entityDefinition.js";

export const languagesExportEntity: EntityDefinition<ReadonlyArray<LanguageContracts.ILanguageModelContract>> = {
    name: "languages",
    fetchEntities: client => client.listLanguages().toAllPromise().then(res => res.data.items.map(l => l._raw)),
    serializeEntities: collections => JSON.stringify(collections),
  };
  