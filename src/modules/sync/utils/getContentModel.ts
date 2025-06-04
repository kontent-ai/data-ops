import * as fs from "node:fs/promises";
import type { ManagementClient } from "@kontent-ai/management-sdk";
import type { ZodType, z } from "zod";
import { fromError } from "zod-validation-error";

import type { LogOptions } from "../../../log.js";
import { throwError } from "../../../utils/error.js";
import { second } from "../../../utils/function.js";
import { superiorFromEntries } from "../../../utils/object.js";
import { notNullOrUndefined } from "../../../utils/typeguards.js";
import type { SyncEntityName } from "../constants/entities.js";
import * as filenames from "../constants/filename.js";
import {
  assetFoldersFileName,
  collectionsFileName,
  contentTypeSnippetsFileName,
  contentTypesFileName,
  languagesFileName,
  spacesFileName,
  taxonomiesFileName,
  webSpotlightFileName,
  workflowsFileName,
} from "../constants/filename.js";
import { fetchModel, transformSyncModel } from "../generateSyncModel.js";
import type { FileContentModel } from "../types/fileContentModel.js";
import {
  SyncAssetFolderSchema,
  SyncCollectionsSchema,
  SyncLanguageSchema,
  SyncSnippetsSchema,
  SyncSpacesSchema,
  SyncTaxonomySchema,
  SyncTypesSchema,
  SyncWebSpotlightSchema,
  SyncWorkflowSchema,
} from "../validation/syncSchemas.js";
import { getRequiredCodenames } from "./contentTypeHelpers.js";
import { fetchRequiredAssetsByCodename, fetchRequiredContentItemsByCodename } from "./fetchers.js";

type ParseWithError<Result> = ParseResult<Result> | ParseError;
type ParseError = { success: false; error: Error };
type ParseResult<Result> = { success: true; result: Result };

export const getSourceSyncModelFromFolder = async (
  folderName: string,
  entities: ReadonlySet<SyncEntityName>,
) => {
  const fileModel = await readContentModelFromFolder(folderName);

  const fileModelKeys = Object.keys(fileModel);
  const keysDifference = [...entities].filter((k) => !fileModelKeys.includes(k));

  if (keysDifference.length) {
    throw new Error(`Missing files in folder for these entities: ${keysDifference.join(", ")}`);
  }

  return createFullContentModel(fileModel);
};

export const fetchSourceSyncModel = async (
  client: ManagementClient,
  fetchDependencies: ReadonlySet<SyncEntityName>,
  logOptions: LogOptions,
) => transformSyncModel(await fetchModel(client, fetchDependencies), logOptions);

const readContentModelFromFolder = async (
  folderName: string,
): Promise<Partial<FileContentModel>> => {
  const syncFiles = await loadSyncFilesFromFolder(folderName);

  const parseEntity = async <EntityName extends string, T>(
    entity: EntityName,
    entityFilename: string,
    schema: ZodType<T>,
  ): Promise<[EntityName, ParseWithError<T>] | undefined> =>
    syncFiles.has(entityFilename)
      ? ([
          entity,
          parseSchema(schema, syncFiles.get(entityFilename) as string, entityFilename),
        ] as const)
      : undefined;

  const parseResults = (
    [
      await parseEntity("contentTypes", contentTypesFileName, SyncTypesSchema),
      await parseEntity("contentTypeSnippets", contentTypeSnippetsFileName, SyncSnippetsSchema),
      await parseEntity("taxonomies", taxonomiesFileName, SyncTaxonomySchema),
      await parseEntity("collections", collectionsFileName, SyncCollectionsSchema),
      await parseEntity("webSpotlight", webSpotlightFileName, SyncWebSpotlightSchema),
      await parseEntity("assetFolders", assetFoldersFileName, SyncAssetFolderSchema),
      await parseEntity("spaces", spacesFileName, SyncSpacesSchema),
      await parseEntity("languages", languagesFileName, SyncLanguageSchema),
      await parseEntity("workflows", workflowsFileName, SyncWorkflowSchema),
    ] as const
  ).filter(notNullOrUndefined);

  const errors = parseResults
    .filter((r) => second<ParseWithError<unknown>, ParseError, string, []>((x) => !x.success)(r))
    .map(([, value]) => value.error);

  if (errors.length) {
    throw new AggregateError(errors);
  }

  return superiorFromEntries(
    parseResults.map(([key, value]) =>
      value.success ? [key, value.result] : throwError("Error with parsing the model from folder."),
    ),
  );
};

const createFullContentModel = (partialModel: Partial<FileContentModel>): FileContentModel => ({
  contentTypes: partialModel.contentTypes ?? [],
  contentTypeSnippets: partialModel.contentTypeSnippets ?? [],
  taxonomies: partialModel.taxonomies ?? [],
  webSpotlight: partialModel.webSpotlight ?? {
    root_type: { codename: "non-existent" },
    enabled: false,
  },
  assetFolders: partialModel.assetFolders ?? [],
  collections: partialModel.collections ?? [],
  spaces: partialModel.spaces ?? [],
  languages: partialModel.languages ?? [],
  workflows: partialModel.workflows ?? [],
});

const loadSyncFilesFromFolder = async (
  folderName: string,
): Promise<ReadonlyMap<string, string>> => {
  const filesPromises = await Object.entries(filenames).map(([, filename]) =>
    fs
      .stat(`${folderName}/${filename}`)
      .then(
        async () => [filename, await fs.readFile(`${folderName}/${filename}`, "utf-8")] as const,
      )
      .catch(() => undefined),
  );

  const result = (await Promise.all(filesPromises)).filter(notNullOrUndefined);

  return new Map(result);
};

const parseSchema = <Output>(
  schema: z.ZodType<Output, z.ZodTypeDef, unknown>,
  file: string,
  filename: string,
): ParseWithError<Output> => {
  const result = schema.safeParse(JSON.parse(file));

  return result.success
    ? { success: true, result: result.data }
    : {
        success: false,
        error: new Error(
          fromError(result.error, { unionSeparator: " or\n", prefix: filename }).message,
        ),
      };
};

type AssetItemsCodenames = Readonly<{
  assetCodenames: ReadonlySet<string>;
  itemCodenames: ReadonlySet<string>;
}>;

export const getSourceItemAndAssetCodenames = (
  sourceModel: FileContentModel,
): AssetItemsCodenames =>
  [...sourceModel.contentTypes, ...sourceModel.contentTypeSnippets].reduce<{
    assetCodenames: Set<string>;
    itemCodenames: Set<string>;
  }>(
    (previous, type) => {
      const requiredIds = getRequiredCodenames(type.elements);

      requiredIds.assetCodenames.forEach((c) => previous.assetCodenames.add(c));
      requiredIds.itemCodenames.forEach((c) => previous.itemCodenames.add(c));

      return previous;
    },
    {
      assetCodenames: new Set(),
      itemCodenames: new Set(
        sourceModel.spaces
          .map((s) => s.web_spotlight_root_item?.codename)
          .filter(notNullOrUndefined),
      ),
    },
  );

export const getTargetContentModel = async (
  targetClient: ManagementClient,
  itemAndAssetCodenames: AssetItemsCodenames,
  logOptions: LogOptions,
  entities: Set<SyncEntityName>,
) => {
  const targetModel = await fetchModel(targetClient, entities);
  const targetAssetsBySourceCodenames = await fetchRequiredAssetsByCodename(
    targetClient,
    Array.from(itemAndAssetCodenames.assetCodenames),
  );
  const targetItemsBySourceCodenames = await fetchRequiredContentItemsByCodename(
    targetClient,
    Array.from(itemAndAssetCodenames.itemCodenames),
  );

  const assetsReferences = new Map(
    targetAssetsBySourceCodenames.map((i) => [i.codename, { id: i.id, codename: i.codename }]),
  );
  const itemReferences = new Map(
    targetItemsBySourceCodenames.map((i) => [i.codename, { id: i.id, codename: i.codename }]),
  );
  const transformedTargetModel = transformSyncModel(targetModel, logOptions);

  return {
    assetsReferences,
    itemReferences,
    transformedTargetModel,
  };
};
