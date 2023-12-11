import { ManagementClient } from "@kontent-ai/management-sdk";
import JSZip from "jszip";

export type EntityDefinition<T> = Readonly<{
  name: string;
  fetchEntities: (client: ManagementClient) => Promise<T>;
  serializeEntities: (entities: T) => string;
  addOtherFiles?: (loadedEntities: T, zip: JSZip) => Promise<void>;
  deserializeEntities: (serialized: string) => T;
  importEntities: (client: ManagementClient, entities: T, context: ImportContext, zip: JSZip) => Promise<void | ImportContext>;
  dependentImportActions?: ReadonlyArray<DependentImportAction<T>>;
}>;

export type DependentImportAction<T> = Readonly<{
  dependentOnEntities: ReadonlyArray<EntityDefinition<any>>;
  action: (client: ManagementClient, entities: T, context: ImportContext) => Promise<void>;
}>;

export type ImportContext = Readonly<{
  collectionIdsByOldIds: ReadonlyMap<string, string>;
  languageIdsByOldIds: ReadonlyMap<string, string>;
  taxonomyGroupIdsByOldIds: IdsMap;
  taxonomyTermIdsByOldIds: IdsMap;
  assetFolderIdsByOldIds: IdsMap;
  assetIdsByOldIds: IdsMap;
  contentTypeSnippetIdsWithElementsByOldIds: ReadonlyMap<string, Readonly<{ selfId: string; elementIdsByOldIds: IdsMap }>>;
  contentTypeIdsWithElementsByOldIds: ReadonlyMap<string, Readonly<{ selfId: string; elementIdsByOldIds: IdsMap }>>;
  contentItemIdsByOldIds: IdsMap;
}>;

type IdsMap = ReadonlyMap<string, string>;

type DependenciesValidationContext = Readonly<{
  foundErrors: ReadonlyArray<string>;
  loadedEntities: ReadonlyArray<string>;
}>;

export const validateEntityDefinitions = (orderedEntityDefinitions: ReadonlyArray<EntityDefinition<any>>): ReadonlyArray<string> =>
  validateDependentImportActions(orderedEntityDefinitions);

const validateDependentImportActions = (orderedEntityDefinitions: ReadonlyArray<EntityDefinition<any>>): ReadonlyArray<string> =>
  orderedEntityDefinitions.reduce<DependenciesValidationContext>((context, def) => {
    const depNames = (def.dependentImportActions?.flatMap(dep => dep.dependentOnEntities) ?? []).map(d => d.name);
    const devDepsOnImportedEntities = depNames.filter(dep => context.loadedEntities.includes(dep) || dep === def.name);

    const errors: string[] = [];

    if (devDepsOnImportedEntities.length) {
      errors.push(`Entity "${def.name}" has dependentImportActions that depend on entities that are imported before it. Such entities are: [${devDepsOnImportedEntities.join(", ")}].`);
    }
    const nonExistentDeps = depNames.filter(name => !orderedEntityDefinitions.find(d => d.name === name));
    if (nonExistentDeps.length) {
      errors.push(`Entity "${def.name}" has dependentImportActions that depend on entities that will not be imported. Such entities are: [${nonExistentDeps.join(", ")}].`);
    }

    return ({
      foundErrors: errors.length ? [...context.foundErrors, ...errors] : context.foundErrors,
      loadedEntities: [...context.loadedEntities, def.name],
    });
  }, { foundErrors: [], loadedEntities: []}).foundErrors;
