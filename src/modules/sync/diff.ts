import { assetFoldersHandler } from "./diff/assetFolder.js";
import { Handler } from "./diff/combinators.js";
import { makeContentTypeHandler, wholeContentTypesHandler } from "./diff/contentType.js";
import { makeContentTypeSnippetHandler, wholeContentTypeSnippetsHandler } from "./diff/contentTypeSnippet.js";
import { taxonomyGroupHandler, wholeTaxonomyGroupsHandler } from "./diff/taxonomy.js";
import {
  transformSnippetToAddModel,
  transformTaxonomyToAddModel,
  transformTypeToAddModel,
} from "./diff/transformToAddModel.js";
import { webSpotlightHandler } from "./diff/webSpotlight.js";
import { DiffModel } from "./types/diffModel.js";
import { FileContentModel } from "./types/fileContentModel.js";
import { PatchOperation } from "./types/patchOperation.js";

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
    wholeTaxonomyGroupsHandler(params.sourceEnvModel.taxonomyGroups, params.targetEnvModel.taxonomyGroups),
    taxonomyGroupHandler,
  );

  const webSpotlightDiffModel = webSpotlightHandler(
    params.sourceEnvModel.webSpotlight,
    params.targetEnvModel.webSpotlight,
  );

  const assetFoldersDiffModel = assetFoldersHandler(
    params.sourceEnvModel.assetFolders,
    params.targetEnvModel.assetFolders,
  );

  return {
    // All the arrays are mutable in the SDK (even though they shouldn't) and readonly in our models. Unfortunately, TS doesn't allow casting it without casting to unknown first.
    taxonomyGroups: mapAdded(taxonomyDiffModel, transformTaxonomyToAddModel),
    contentTypeSnippets: mapAdded(snippetsDiffModel, transformSnippetToAddModel(params)),
    contentTypes: mapAdded(typesDiffModel, transformTypeToAddModel(params)),
    webSpotlight: webSpotlightDiffModel,
    assetFolders: assetFoldersDiffModel,
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
