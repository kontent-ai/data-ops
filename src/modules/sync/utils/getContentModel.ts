import { ManagementClient } from "@kontent-ai/management-sdk";
import * as fs from "fs/promises";
import { z } from "zod";
import { fromError } from "zod-validation-error";

import { LogOptions } from "../../../log.js";
import { throwError } from "../../../utils/error.js";
import { superiorFromEntries } from "../../../utils/object.js";
import { notNullOrUndefined } from "../../../utils/typeguards.js";
import { Either } from "../../../utils/types.js";
import {
  assetFoldersFileName,
  collectionsFileName,
  contentTypesFileName,
  contentTypeSnippetsFileName,
  languagesFileName,
  spacesFileName,
  taxonomiesFileName,
  webSpotlightFileName,
} from "../constants/filename.js";
import { fetchModel, transformSyncModel } from "../generateSyncModel.js";
import { FileContentModel } from "../types/fileContentModel.js";
import {
  SyncAssetFolderSchema,
  SyncCollectionsSchema,
  SyncLanguageSchema,
  SyncSnippetsSchema,
  SyncSpacesSchema,
  SyncTaxonomySchema,
  SyncTypesSchema,
  SyncWebSpotlightSchema,
} from "../validation/syncSchemas.js";
import { getRequiredCodenames } from "./contentTypeHelpers.js";
import { fetchRequiredAssetsByCodename, fetchRequiredContentItemsByCodename } from "./fetchers.js";

type ParseWithError<Result> = Either<ParseResult<Result>, ParseError>;
type ParseError = { success: false; error: Error };
type ParseResult<Result> = { success: true; result: Result };

export const readContentModelFromFolder = async (folderName: string): Promise<FileContentModel> => {
  const parseReults = [
    ["contentTypes", await parseSchema(SyncTypesSchema, folderName, contentTypesFileName)],
    ["contentTypeSnippets", await parseSchema(SyncSnippetsSchema, folderName, contentTypeSnippetsFileName)],
    ["taxonomyGroups", await parseSchema(SyncTaxonomySchema, folderName, taxonomiesFileName)],
    ["collections", await parseSchema(SyncCollectionsSchema, folderName, collectionsFileName)],
    ["webSpotlight", await parseSchema(SyncWebSpotlightSchema, folderName, webSpotlightFileName)],
    ["assetFolders", await parseSchema(SyncAssetFolderSchema, folderName, assetFoldersFileName)],
    ["spaces", await parseSchema(SyncSpacesSchema, folderName, spacesFileName)],
    ["languages", await parseSchema(SyncLanguageSchema, folderName, languagesFileName)],
  ] as const;

  const isError = (a: ParseWithError<unknown>): a is ParseError => !a.success;

  const isErrorEntry = <EntityName>(
    tuple: readonly [EntityName, ParseWithError<unknown>],
  ): tuple is [EntityName, ParseError] => isError(tuple[1]);

  const errors = parseReults.filter(isErrorEntry).map(([, val]) => val.error);

  if (errors.length) {
    throw new AggregateError(errors);
  }

  return superiorFromEntries(
    parseReults.map(([key, value]) =>
      value.success ? [key, value.result] : throwError("Error with parsing the model from folder.")
    ),
  );
};

const parseSchema = async <Output>(
  schema: z.ZodType<Output, z.ZodTypeDef, unknown>,
  folderName: string,
  filename: string,
): Promise<ParseWithError<Output>> => {
  const result = schema.safeParse(JSON.parse(await fs.readFile(`${folderName}/${filename}`, "utf8")));

  return result.success
    ? { success: true, result: result.data }
    : {
      success: false,
      error: new Error(fromError(result.error, { unionSeparator: " or\n", prefix: filename }).message),
    };
};

type AssetItemsCodenames = Readonly<{
  assetCodenames: ReadonlySet<string>;
  itemCodenames: ReadonlySet<string>;
}>;

export const getSourceItemAndAssetCodenames = (sourceModel: FileContentModel): AssetItemsCodenames =>
  [...sourceModel.contentTypes, ...sourceModel.contentTypeSnippets]
    .reduce<{ assetCodenames: Set<string>; itemCodenames: Set<string> }>(
      (previous, type) => {
        const requiredIds = getRequiredCodenames(type.elements);

        requiredIds.assetCodenames.forEach(c => previous.assetCodenames.add(c));
        requiredIds.itemCodenames.forEach(c => previous.itemCodenames.add(c));

        return previous;
      },
      {
        assetCodenames: new Set(),
        itemCodenames: new Set(
          sourceModel.spaces.map(s => s.web_spotlight_root_item?.codename).filter(notNullOrUndefined),
        ),
      },
    );

export const getTargetContentModel = async (
  targetClient: ManagementClient,
  itemAndAssetCodenames: AssetItemsCodenames,
  logOptions: LogOptions,
) => {
  const targetModel = await fetchModel(targetClient);
  const targetAssetsBySourceCodenames = await fetchRequiredAssetsByCodename(
    targetClient,
    Array.from(itemAndAssetCodenames.assetCodenames),
  );
  const targetItemsBySourceCodenames = await fetchRequiredContentItemsByCodename(
    targetClient,
    Array.from(itemAndAssetCodenames.itemCodenames),
  );

  const assetsReferences = new Map(
    targetAssetsBySourceCodenames.map(i => [i.codename, { id: i.id, codename: i.codename }]),
  );
  const itemReferences = new Map(
    targetItemsBySourceCodenames.map(i => [i.codename, { id: i.id, codename: i.codename }]),
  );
  const transformedTargetModel = transformSyncModel(targetModel, logOptions);

  return {
    assetsReferences,
    itemReferences,
    transformedTargetModel,
  };
};
