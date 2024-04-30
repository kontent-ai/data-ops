import { LanguageContracts, LanguageModels, LanguageResponses, ManagementClient } from "@kontent-ai/management-sdk";

import { defaultCodename, defaultName, emptyId } from "../../../constants/ids.js";
import { serially } from "../../../utils/requests.js";
import { notNull } from "../../../utils/typeguards.js";
import { EntityDefinition } from "../entityDefinition.js";

const defaultLanguageId = emptyId;
const defaultLanguageName = defaultName;
const defaultLanguageCodename = defaultCodename;

export const languagesEntity: EntityDefinition<ReadonlyArray<LanguageContracts.ILanguageModelContract>> = {
  name: "languages",
  displayName: "languages",
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
    await updateProjectLanguage(client, projectDefaultLangauge, importDefaultLanguage, modifyByCodename);
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
  cleanEntities: async (client, languages) => {
    await serially(
      languages
        .map((lang) => () =>
          client
            .modifyLanguage()
            .byLanguageId(lang.id)
            .withData(createPatchToCleanLanguage(lang))
            .toPromise()
        ),
    );

    await serially(
      languages
        .filter(l => !l.is_default)
        .map((lang) => () =>
          client
            .modifyLanguage()
            .byLanguageId(lang.id)
            .withData([createReplaceIsActiveOperation(false)])
            .toPromise()
        ),
    );
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

const createPatchToCleanLanguage = (
  language: LanguageContracts.ILanguageModelContract,
): LanguageModels.IModifyLanguageData[] =>
  language.is_default
    ? [
      createReplaceCodenameOperation(defaultLanguageCodename),
      createReplaceNameOperation(defaultLanguageName),
    ]
    : [
      /**
       * languages cannot be deleted, instead they are deactivated
       * and their name and codename are both populated with first 8 chars of their ID
       * (name and codename have a limit of 25 characters).
       *
       * only active languages can be modified.
       */
      createReplaceIsActiveOperation(true),
      createReplaceFallbackLanguageOperation(defaultLanguageCodename),
      createReplaceCodenameOperation(language.id.slice(0, 7)),
      createReplaceNameOperation(language.id.slice(0, 7)),
    ];

const updateProjectLanguage = async (
  client: ManagementClient,
  projectLanguage: LanguageModels.LanguageModel,
  importLanguage: LanguageContracts.ILanguageModelContract,
  modifyLanguage: (
    client: ManagementClient,
    projectLanguage: LanguageModels.LanguageModel,
    operations: LanguageModels.IModifyLanguageData[],
  ) => Promise<LanguageResponses.ModifyLanguageResponse>,
) => {
  const operations: LanguageModels.IModifyLanguageData[] = [];

  if (projectLanguage.id !== defaultLanguageId && !projectLanguage.isActive) {
    operations.push(createReplaceIsActiveOperation(true));
  }

  if (projectLanguage.codename !== importLanguage.codename) {
    operations.push(createReplaceCodenameOperation(importLanguage.codename));
  }

  if (projectLanguage.name !== importLanguage.name) {
    operations.push(createReplaceNameOperation(importLanguage.name));
  }

  if (operations.length > 0) {
    return modifyLanguage(client, projectLanguage, operations);
  }

  return Promise.resolve();
};

const modifyByCodename = (
  client: ManagementClient,
  projectLanguage: LanguageModels.LanguageModel,
  operations: LanguageModels.IModifyLanguageData[],
) =>
  client
    .modifyLanguage()
    .byLanguageCodename(projectLanguage.codename)
    .withData(operations)
    .toPromise();

const modifyByExternalId = (
  client: ManagementClient,
  projectLanguage: LanguageModels.LanguageModel,
  operations: LanguageModels.IModifyLanguageData[],
) =>
  client
    .modifyLanguage()
    .byExternalId(getLanguageExternalId(projectLanguage))
    .withData(operations)
    .toPromise();

const importLanguagesToProject = async (
  client: ManagementClient,
  importLanguages: ReadonlyArray<LanguageContracts.ILanguageModelContract>,
) => {
  const projectLanguages = await client.listLanguages().toAllPromise().then(res => res.data.items);

  await serially(
    importLanguages
      .filter(l => l.id !== defaultLanguageId)
      .map(importLanguage => () => {
        const languageByExternalId = projectLanguages.find(l => l.externalId === getLanguageExternalId(importLanguage));

        const languageByCodename = projectLanguages.find(l => l.codename === importLanguage.codename);

        const languageByName = projectLanguages.find(l => l.name === importLanguage.name);

        const operation = handleDifferentLanguagesOnEnvironment(
          { importLanguage, languageByExternalId, languageByCodename, languageByName },
        );

        switch (operation.operation) {
          case "add":
            return client
              .addLanguage()
              .withData({
                name: importLanguage.name,
                codename: importLanguage.codename,
                is_active: true,
                external_id: importLanguage.external_id ?? `${importLanguage.codename}`.slice(0, 50),
              })
              .toPromise();
          case "updateByCodename":
            return updateProjectLanguage(client, operation.projectLanguage, importLanguage, modifyByCodename);
          case "updateByExternalId":
            return updateProjectLanguage(client, operation.projectLanguage, importLanguage, modifyByExternalId);
        }
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

const handleDifferentLanguagesOnEnvironment = (
  langauages: {
    importLanguage: LanguageContracts.ILanguageModelContract;
    languageByExternalId: LanguageModels.LanguageModel | undefined;
    languageByCodename: LanguageModels.LanguageModel | undefined;
    languageByName: LanguageModels.LanguageModel | undefined;
  },
): { operation: "add" } | {
  operation: "updateByCodename" | "updateByExternalId";
  projectLanguage: LanguageModels.LanguageModel;
} => {
  const {
    importLanguage,
    languageByExternalId,
    languageByCodename,
    languageByName,
  } = langauages;

  if (languageByExternalId) {
    assertAreLanguagesDifferent(importLanguage, languageByExternalId, languageByCodename, "codename");
    assertAreLanguagesDifferent(importLanguage, languageByExternalId, languageByName, "name");

    return { operation: "updateByExternalId", projectLanguage: languageByExternalId };
  }

  if (languageByCodename) {
    assertAreLanguagesDifferent(importLanguage, languageByCodename, languageByName, "name");

    return { operation: "updateByCodename", projectLanguage: languageByCodename };
  }

  if (languageByName) {
    throw new Error(
      `Failed to import language (codename: ${importLanguage.codename}) as there is other language in target environment with same name(codename: ${languageByName.codename})`,
    );
  }

  return { operation: "add" };
};

const assertAreLanguagesDifferent = (
  importLanguage: LanguageContracts.ILanguageModelContract,
  language1: LanguageModels.LanguageModel,
  language2: LanguageModels.LanguageModel | undefined,
  key: keyof LanguageModels.LanguageModel,
) => {
  if (language2 && language2.id !== language1.id) {
    throw new Error(
      `Failed to import language (codename: ${importLanguage.codename}, name: ${importLanguage.name}${
        importLanguage.external_id ? `, external_id: ${importLanguage.external_id}` : ""
      }) as there is other language in target environment with same ${key}(codename: ${language2.codename}, name: ${importLanguage.name}${
        language2.externalId ? `, external_id: ${language2.externalId}` : ""
      })`,
    );
  }
};

const getLanguageExternalId = (language: LanguageModels.LanguageModel | LanguageContracts.ILanguageModelContract) => {
  if ("externalId" in language) {
    return language.externalId ?? makeLangCodenameExternalId(language.codename);
  }

  if ("external_id" in language) {
    return language.external_id ?? makeLangCodenameExternalId(language.codename);
  }

  return makeLangCodenameExternalId(language.codename);
};

const makeLangCodenameExternalId = (codename: string) => codename.slice(0, 50);
