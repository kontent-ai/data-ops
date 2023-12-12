import { LanguageContracts, LanguageModels, ManagementClient } from "@kontent-ai/management-sdk";

import { serially } from "../../../utils/requests.js";
import { notNull } from "../../../utils/typeguards.js";
import { EntityDefinition } from "../entityDefinition.js";

const defaultLanguageId = "00000000-0000-0000-0000-000000000000";

export const languagesEntity: EntityDefinition<ReadonlyArray<LanguageContracts.ILanguageModelContract>> = {
  name: "languages",
  fetchEntities: client => client.listLanguages().toAllPromise().then(res => res.data.items.map(l => l._raw)),
  serializeEntities: collections => JSON.stringify(collections),
  deserializeEntities: serialized => JSON.parse(serialized),
  importEntities: async (client, entities, context) => {
    const importDefaultLanguage = entities.find(l =>
      l.id === defaultLanguageId
    ) as LanguageContracts.ILanguageModelContract;
    const projectDefaultLangauge = await client.viewLanguage().byLanguageId(defaultLanguageId).toPromise().then(res =>
      res.data
    );

    // Order is important
    await updateProjectLanguage(client, projectDefaultLangauge, importDefaultLanguage);
    await importLanguagesToProject(client, entities);

    const projectLanguages = await client.listLanguages().toAllPromise().then(res => res.data.items);

    await updateFallbackLanguages(client, projectLanguages, entities);

    return {
      ...context,
      languageIdsByOldIds: new Map(
        entities
          .map(importLanguage => {
            const projectLanguage = projectLanguages.find(lang => lang.codename === importLanguage.codename);

            return projectLanguage ? [importLanguage.id, projectLanguage.id] as const : null;
          })
          .filter(notNull),
      ),
    };
  },
};

const createReplaceCodenameOperation = (codename: string): LanguageModels.IModifyLanguageData => ({
  op: "replace",
  property_name: "codename",
  value: codename,
});

const createReplaceNameOperation = (name: string): LanguageModels.IModifyLanguageData => ({
  op: "replace",
  property_name: "name",
  value: name,
});

const createReplaceFallbackLanguageOperation = (codename: string): LanguageModels.IModifyLanguageData => ({
  op: "replace",
  property_name: "fallback_language",
  value: { codename },
});

const createReplaceIsActiveOperation = (isActive: boolean): LanguageModels.IModifyLanguageData => ({
  op: "replace",
  property_name: "is_active",
  value: isActive,
});

const updateProjectLanguage = async (
  client: ManagementClient,
  projectLanguage: LanguageModels.LanguageModel,
  importLanguage: LanguageContracts.ILanguageModelContract,
) => {
  const operations: LanguageModels.IModifyLanguageData[] = [];

  if (projectLanguage.codename !== importLanguage.codename) {
    operations.push(createReplaceCodenameOperation(importLanguage.codename));
  }

  if (projectLanguage.name !== importLanguage.name) {
    operations.push(createReplaceNameOperation(importLanguage.name));
  }

  if (projectLanguage.id !== defaultLanguageId && !projectLanguage.isActive) {
    operations.push(createReplaceIsActiveOperation(true));
  }

  if (operations.length > 0) {
    return client
      .modifyLanguage()
      .byLanguageCodename(projectLanguage.codename)
      .withData(operations)
      .toPromise();
  }

  return Promise.resolve();
};

const importLanguagesToProject = async (
  client: ManagementClient,
  importLanguages: ReadonlyArray<LanguageContracts.ILanguageModelContract>,
) => {
  const projectLanguages = await client.listLanguages().toAllPromise().then(res => res.data.items);

  await serially(
    importLanguages
      .filter(l => l.id !== defaultLanguageId)
      .map(importLanguage => () => {
        const projectLanguage = projectLanguages.find(l => l.codename === importLanguage.codename);

        const otherProjectLanguageMatchOnName = projectLanguages.find(l =>
          l.name === importLanguage.name && l.codename !== importLanguage.codename
        );

        if (otherProjectLanguageMatchOnName) {
          throw new Error(
            `Could not update name of the language with codename ${importLanguage.codename}. The other language with codename ${otherProjectLanguageMatchOnName.codename} has the same name. Fix your languages names to continue`,
          );
        }

        if (projectLanguage) {
          return updateProjectLanguage(client, projectLanguage, importLanguage);
        }

        return client
          .addLanguage()
          .withData({
            name: importLanguage.name,
            codename: importLanguage.codename,
            is_active: true,
            external_id: importLanguage.external_id ?? `${importLanguage.codename}`.slice(0, 50),
          })
          .toPromise();
      }),
  );
};

const updateFallbackLanguages = async (
  client: ManagementClient,
  projectLanguages: LanguageModels.LanguageModel[],
  importLanguages: ReadonlyArray<LanguageContracts.ILanguageModelContract>,
) => {
  await serially(
    importLanguages
      .filter(lang => lang.id !== defaultLanguageId)
      .map(importLanguage => {
        const projectLanguage = projectLanguages.find(l => l.codename === importLanguage.codename);
        if (!projectLanguage) {
          throw new Error(`Could not find the language with codename ${importLanguage.codename} in the project.`);
        }
        return [importLanguage, projectLanguage] as const;
      })
      .map(([importLanguage, projectLanguage]) => () => {
        const projectFallbackLanguage = projectLanguages.find(l => l.id === projectLanguage.fallbackLanguage?.id);
        const importFallbackLanguage = importLanguages.find(l => l.id === importLanguage.fallback_language?.id);

        if (
          projectFallbackLanguage && importFallbackLanguage
          && projectFallbackLanguage.codename !== importFallbackLanguage.codename
        ) {
          return client
            .modifyLanguage()
            .byLanguageCodename(importLanguage.codename)
            .withData([
              createReplaceFallbackLanguageOperation(importFallbackLanguage.codename),
            ])
            .toPromise();
        }

        return Promise.resolve();
      }),
  );
};
