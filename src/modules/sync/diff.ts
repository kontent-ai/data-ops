import { WorkflowModels } from "@kontent-ai/management-sdk";

import { throwError } from "../../utils/error.js";
import { RequiredCodename } from "../../utils/types.js";
import { assetFoldersHandler } from "./diff/assetFolder.js";
import { collectionsHandler } from "./diff/collection.js";
import { Handler } from "./diff/combinators.js";
import { makeContentTypeHandler, wholeContentTypesHandler } from "./diff/contentType.js";
import { makeContentTypeSnippetHandler, wholeContentTypeSnippetsHandler } from "./diff/contentTypeSnippet.js";
import { languageHandler, wholeLanguageHandler } from "./diff/language.js";
import { spaceHandler, wholeSpacesHandler } from "./diff/space.js";
import { taxonomyGroupHandler, wholeTaxonomyGroupsHandler } from "./diff/taxonomy.js";
import {
  transformSnippetToAddModel,
  transformTaxonomyToAddModel,
  transformTypeToAddModel,
} from "./diff/transformToAddModel.js";
import { webSpotlightHandler } from "./diff/webSpotlight.js";
import { wholeWorkflowsHandler, workflowHandler } from "./diff/workflow.js";
import { DiffModel, DiffObject } from "./types/diffModel.js";
import { FileContentModel } from "./types/fileContentModel.js";
import { PatchOperation } from "./types/patchOperation.js";
import { LanguageSyncModel, WorkflowSyncModel } from "./types/syncModel.js";

type TargetReference = { id: string; codename: string };

export type DiffParams = Readonly<{
  targetItemsReferencedFromSourceByCodenames: ReadonlyMap<string, Readonly<TargetReference>>;
  targetAssetsReferencedFromSourceByCodenames: ReadonlyMap<string, Readonly<TargetReference>>;
  sourceEnvModel: FileContentModel;
  targetEnvModel: FileContentModel;
}>;

export const diff = (params: DiffParams): DiffModel => {
  const diffType = makeContentTypeHandler({
    targetItemsByCodenames: params.targetItemsReferencedFromSourceByCodenames,
    targetAssetsByCodenames: params.targetAssetsReferencedFromSourceByCodenames,
  });

  const typesDiffModel = createDiffModel(
    wholeContentTypesHandler(
      params.sourceEnvModel.contentTypes,
      params.targetEnvModel.contentTypes,
    ),
    diffType,
  );

  const diffSnippet = makeContentTypeSnippetHandler({
    targetItemsByCodenames: params.targetItemsReferencedFromSourceByCodenames,
    targetAssetsByCodenames: params.targetAssetsReferencedFromSourceByCodenames,
  });

  const snippetsDiffModel = createDiffModel(
    wholeContentTypeSnippetsHandler(
      params.sourceEnvModel.contentTypeSnippets,
      params.targetEnvModel.contentTypeSnippets,
    ),
    diffSnippet,
  );

  const taxonomyDiffModel = createDiffModel(
    wholeTaxonomyGroupsHandler(params.sourceEnvModel.taxonomies, params.targetEnvModel.taxonomies),
    taxonomyGroupHandler,
  );

  const collectionDiffModel = collectionsHandler(
    params.sourceEnvModel.collections,
    params.targetEnvModel.collections,
  );

  const webSpotlightDiffModel = webSpotlightHandler(
    params.sourceEnvModel.webSpotlight,
    params.targetEnvModel.webSpotlight,
  );

  const assetFoldersDiffModel = assetFoldersHandler(
    params.sourceEnvModel.assetFolders,
    params.targetEnvModel.assetFolders,
  );

  const spacesDiffModel = createDiffModel(
    wholeSpacesHandler(params.sourceEnvModel.spaces, params.targetEnvModel.spaces),
    spaceHandler,
  );

  const languageDiffModel = getLanguageDiffModel(params.sourceEnvModel.languages, params.targetEnvModel.languages);

  const workflowsDiffModel: DiffObject<RequiredCodename<WorkflowModels.IAddWorkflowData>> & {
    sourceWorkflows: ReadonlyArray<WorkflowSyncModel>;
  } = {
    ...createDiffModel(
      wholeWorkflowsHandler(params.sourceEnvModel.workflows, params.targetEnvModel.workflows),
      workflowHandler,
    ),
    sourceWorkflows: params.sourceEnvModel.workflows,
  };

  return {
    // All the arrays are mutable in the SDK (even though they shouldn't) and readonly in our models. Unfortunately, TS doesn't allow casting it without casting to unknown first.
    taxonomyGroups: mapAdded(taxonomyDiffModel, transformTaxonomyToAddModel),
    contentTypeSnippets: mapAdded(snippetsDiffModel, transformSnippetToAddModel(params)),
    contentTypes: mapAdded(typesDiffModel, transformTypeToAddModel(params)),
    collections: collectionDiffModel,
    webSpotlight: webSpotlightDiffModel,
    assetFolders: assetFoldersDiffModel,
    spaces: spacesDiffModel,
    languages: languageDiffModel,
    workflows: workflowsDiffModel,
  };
};

const mapAdded = <Entity, NewEntity, Model extends { readonly added: ReadonlyArray<Entity> }>(
  model: Model,
  transformer: (added: Entity) => NewEntity,
): Omit<Model, "added"> & { readonly added: ReadonlyArray<NewEntity> } => ({
  ...model,
  added: model.added.map(transformer),
});

const createDiffModel = <Entity extends Readonly<{ codename: string }>>(
  ops: ReadonlyArray<PatchOperation>,
  diffHandler: Handler<Entity>,
) =>
  ops
    .reduce<Readonly<{ added: Entity[]; updated: Map<string, ReadonlyArray<PatchOperation>>; deleted: Set<string> }>>(
      (prev, op) => {
        switch (op.op) {
          case "replace": {
            const typedValue = op.value as Entity;
            prev.updated.set(typedValue.codename, diffHandler(typedValue, op.oldValue as Entity));

            return prev;
          }
          case "move": {
            return prev; // we can't order top-level models
          }
          case "remove": {
            const typedOldValue = op.oldValue as Entity;
            prev.deleted.add(typedOldValue.codename);

            return prev;
          }
          case "addInto": {
            const typedValue = op.value as Entity;
            prev.added.push(typedValue);

            return prev;
          }
          default:
            return prev;
        }
      },
      { added: [], updated: new Map(), deleted: new Set() },
    );

const getLanguageDiffModel = (
  sourceLanguages: ReadonlyArray<LanguageSyncModel>,
  targetLanguages: ReadonlyArray<LanguageSyncModel>,
): DiffModel["languages"] => {
  if (sourceLanguages.length === 0 && targetLanguages.length === 0) {
    return { added: [], updated: new Map(), deleted: new Set() };
  }

  const sourceDefaultLanguageCodename = getDefaultLang(sourceLanguages).codename;
  const targetDefaultLanguageCodename = getDefaultLang(targetLanguages).codename;

  /**
   * Update the source default language to match the codename of the target default language.
   * This ensures that during the diff process, the existing default language in the target environment is updated,
   * rather than creating a new default language, which is not feasible.
   */
  const languageSource = adjustSourceDefaultLanguageCodename(
    sourceLanguages,
    targetDefaultLanguageCodename,
  );

  const languageDiffModel = createDiffModel(
    wholeLanguageHandler(languageSource, targetLanguages),
    languageHandler,
  );

  /**
   * Manually add an operation to change the codename of the default language in the target environment
   * to match the codename of the default language in the source environment.
   */

  languageDiffModel.updated.set(targetDefaultLanguageCodename, [
    ...languageDiffModel.updated.get(targetDefaultLanguageCodename) ?? [],
    ...sourceDefaultLanguageCodename === targetDefaultLanguageCodename ? [] : [
      {
        op: "replace",
        path: "/codename",
        value: sourceDefaultLanguageCodename,
        oldValue: targetDefaultLanguageCodename,
      } as const,
    ],
  ]);

  return languageDiffModel;
};

const adjustSourceDefaultLanguageCodename = (
  source: ReadonlyArray<LanguageSyncModel>,
  codename: string,
): ReadonlyArray<LanguageSyncModel> => {
  const sourceDefaultLang = getDefaultLang(source);
  const newSource = source.filter(l => l.codename !== sourceDefaultLang.codename);

  return [{ ...sourceDefaultLang, codename }, ...newSource];
};

const getDefaultLang = (languages: ReadonlyArray<LanguageSyncModel>) => {
  const defaultLang = languages.find(l => l.is_default);

  return defaultLang ?? throwError(`Language enviroment model does not contain default language`);
};
