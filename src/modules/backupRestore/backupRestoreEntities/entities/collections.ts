import { CollectionContracts, CollectionModels } from "@kontent-ai/management-sdk";

import { defaultName, emptyId } from "../../../../constants/ids.js";
import { notNull } from "../../../../utils/typeguards.js";
import { compareExternalIds } from "../../utils/utils.js";
import { EntityDefinition } from "../entityDefinition.js";

const defaultCollectionId = emptyId;
const defaultCollectionName = defaultName;

export const collectionsEntity = {
  name: "collections",
  displayName: "collections",
  fetchEntities: client => client.listCollections().toPromise().then(res => res.rawData.collections),
  serializeEntities: collections => JSON.stringify(collections),
  importEntities: async (client, { entities: fileCollections, context }) => {
    const existingCollections = await client.listCollections().toPromise().then(res => res.rawData.collections);
    const matchResults = findCollectionMatches(fileCollections, existingCollections);
    const matchErrors = matchResults.filter(isMatchError);
    if (matchErrors.length) {
      throw new Error(`Cannot import collections due to errors: ${matchErrors.map(e => `"${e.error}"`).join(", ")}.`);
    }
    const collectionsToUpdate = matchResults.filter(isMatch);
    const oldCollectionsToAdd = fileCollections
      .filter(c => !collectionsToUpdate.find(m => m.fileCollection.id === c.id))
      .map((c: Collection) => ({ ...c, external_id: c.external_id ?? c.codename }));

    const newCollections = await client
      .setCollections()
      .withData([
        ...collectionsToUpdate.map(match => ({
          op: "replace" as const,
          reference: { id: match.projectCollection.id },
          property_name: "name",
          value: match.fileCollection.name,
        })),
        ...oldCollectionsToAdd.map(c => ({
          op: "addInto" as const,
          value: {
            name: c.name,
            codename: c.codename,
            external_id: c.external_id,
          },
        })),
      ])
      .toPromise()
      .then(res => res.data.collections);

    return {
      ...context,
      collectionIdsByOldIds: new Map([
        ...collectionsToUpdate.map(match => [match.fileCollection.id, match.projectCollection.id] as const),
        ...newCollections
          .map(c => {
            const oldC = oldCollectionsToAdd.find(oldC => oldC.codename === c.codename);
            return oldC ? [oldC.id, c.id] as const : null;
          })
          .filter(notNull),
      ]),
    };
  },
  deserializeEntities: JSON.parse,
  cleanEntities: async (client, collections) => {
    if (!collections.length) {
      return;
    }

    await client.setCollections()
      .withData(collections.flatMap(createPatchToCleanCollection))
      .toPromise()
      .then(res => res.rawData.collections);
  },
} as const satisfies EntityDefinition<ReadonlyArray<CollectionContracts.ICollectionContract>>;

const findCollectionMatches = (
  fileCollections: ReadonlyArray<Collection>,
  projectCollections: ReadonlyArray<Collection>,
) =>
  fileCollections.flatMap(fileCollection =>
    projectCollections.map(projectCollection => matchCollections(fileCollection, projectCollection))
  );

type MatchResult = Readonly<
  | { match: false }
  | { match: true; fileCollection: Collection; projectCollection: Collection }
  | { error: string }
>;

const isMatchError = (matchResult: MatchResult): matchResult is Readonly<{ error: string }> => "error" in matchResult;

const isMatch = (
  matchResult: MatchResult,
): matchResult is Readonly<{ match: true; fileCollection: Collection; projectCollection: Collection }> =>
  "match" in matchResult && !!matchResult.match;

const matchCollections = (fileCollection: Collection, projectCollection: Collection): MatchResult => {
  const hasSameCodename = fileCollection.codename === projectCollection.codename;
  const externalIdComparison = compareExternalIds(projectCollection.external_id, fileCollection.external_id);

  if (!hasSameCodename && externalIdComparison === "Same") {
    return {
      error:
        `Cannot update codename of collections. Collections with external id "${fileCollection.external_id}" have different codenames (file: "${fileCollection.codename}", project: "${projectCollection.codename}").`,
    };
  }
  if (!hasSameCodename) {
    return { match: false };
  }
  switch (externalIdComparison) {
    case "Same":
    case "BothUndefined":
    case "OnlyFileUndefined":
      return { match: true, fileCollection, projectCollection };

    case "Different":
      return {
        error:
          `Cannot update external id of collections. Collections with codename "${fileCollection.codename}" have different external ids (file: "${fileCollection.external_id}", project: "${projectCollection.external_id}")`,
      };

    case "OnlyProjectUndefined":
      return {
        error:
          `Cannot update external id of collections. Collection with external id "${fileCollection.external_id}" has the same codename ("${fileCollection.codename}") as a collection in the project that has no external id.`,
      };

    default:
      throw new Error(
        `Unknown external id comparison result "${externalIdComparison}". This should never happen, please report an issue if you see this.`,
      );
  }
};

const createReplaceNameOperation = (
  name: string,
  collection: CollectionContracts.ICollectionContract,
): CollectionModels.ISetCollectionData => ({
  op: "replace",
  reference: { id: collection.id },
  property_name: "name",
  value: name,
});

const createRemoveCollectionOperation = (
  collection: CollectionContracts.ICollectionContract,
): CollectionModels.ISetCollectionData => ({
  op: "remove",
  reference: {
    id: collection.id,
  },
});

const createPatchToCleanCollection = (
  collection: CollectionContracts.ICollectionContract,
): CollectionModels.ISetCollectionData[] =>
  collection.id === defaultCollectionId
    ? [
      createReplaceNameOperation(defaultCollectionName, collection),
    ]
    : [
      createRemoveCollectionOperation(collection),
    ];

// This type is needed until the SDK includes the property.
type Collection = CollectionContracts.ICollectionContract & Readonly<{ external_id?: string }>;
