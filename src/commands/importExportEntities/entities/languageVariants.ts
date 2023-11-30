import { LanguageVariantModels } from "@kontent-ai/management-sdk";

import { serially } from "../../../utils/requests.js";
import { EntityDefinition } from "../entityDefinition.js";

export const languageVariantsExportEntity: EntityDefinition<ReadonlyArray<LanguageVariantModels.ContentItemLanguageVariant>> = {
  name: "languageVariants",
  fetchEntities: async client => {
    const collections = await client.listCollections().toPromise().then(res => res.data.collections);

    const promises = collections.map(collection => () => client
      .listLanguageVariantsByCollection()
      .byCollectionCodename(collection.codename)
      .toAllPromise()
      .then(res => res.data.items))

    const variants = await serially(promises)

    return variants.flatMap(arr => arr);
  },
  serializeEntities: collections => JSON.stringify(collections),
  importEntities: () => { throw new Error("Not supported yet.")},
  deserializeEntities: () => { throw new Error("Not supported yet.")},
};
