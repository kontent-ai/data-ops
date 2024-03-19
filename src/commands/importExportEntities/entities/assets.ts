import { AssetContracts, ManagementClient } from "@kontent-ai/management-sdk";
import archiver from "archiver";
import chalk from "chalk";
import { StreamZipAsync } from "node-stream-zip";
import stream from "stream";

import { logInfo, LogOptions } from "../../../log.js";
import { serially } from "../../../utils/requests.js";
import { ReplaceReferences } from "../../../utils/types.js";
import { getRequired } from "../../import/utils.js";
import { EntityDefinition, ImportContext } from "../entityDefinition.js";

const assetsBinariesFolderName = "assets";
const createFileName = (asset: AssetContracts.IAssetModelContract) =>
  `${assetsBinariesFolderName}/${asset.id}-${asset.file_name}`;

type AssetWithElements = ReplaceReferences<AssetContracts.IAssetModelContract> & {
  readonly elements: ReadonlyArray<unknown>;
};

export const assetsEntity: EntityDefinition<ReadonlyArray<AssetWithElements>> = {
  name: "assets",
  displayName: "assets",
  fetchEntities: client =>
    client.listAssets().toAllPromise().then(res => res.data.items.map(a => a._raw as AssetWithElements)),
  serializeEntities: JSON.stringify,
  addOtherFiles: async (assets, archive, logOptions) => {
    await serially(assets.map(a => () => saveAsset(archive, logOptions, a)));
  },
  deserializeEntities: JSON.parse,
  importEntities: async (client, fileAssets, context, logOptions, zip) => {
    const fileAssetsWithElements = fileAssets.filter(a => !!a.elements.length);
    if (fileAssetsWithElements.length) {
      throw new Error(
        `It is not possible to import assets with elements at the moment. Assets that contain elements are: ${
          fileAssetsWithElements.map(a => a.id).join(", ")
        }.`,
      );
    }

    if (!fileAssets.length) {
      return;
    }

    const assetIdEntries = await serially(
      fileAssets.map(createImportAssetFetcher(zip, client, context, logOptions)),
    );

    return {
      ...context,
      assetIdsByOldIds: new Map(assetIdEntries),
    };
  },
  cleanEntities: async (client, assets) => {
    if (!assets.length) {
      return;
    }

    await serially(assets.map(asset => () =>
      client.deleteAsset()
        .byAssetId(asset.id)
        .toPromise()
    ));
  },
};

const saveAsset = async (
  archive: archiver.Archiver,
  logOptions: LogOptions,
  asset: AssetContracts.IAssetModelContract,
) => {
  logInfo(logOptions, "verbose", `Exporting: file ${chalk.yellow(asset.file_name)}.`);
  const file = await fetch(asset.url).then(res => res.blob()).then(res => res.stream());
  archive.append(stream.Readable.fromWeb(file), { name: createFileName(asset) });
};

const createImportAssetFetcher =
  (zip: StreamZipAsync, client: ManagementClient, context: ImportContext, logOptions: LogOptions) =>
  (fileAsset: AssetWithElements) =>
  async (): Promise<readonly [string, string]> => {
    const binary = await zip.entryData(createFileName(fileAsset));

    const folderId = fileAsset.folder?.id
      ? getRequired(context.assetFolderIdsByOldIds, fileAsset.folder.id, "folder")
      : undefined;
    const collectionId = fileAsset.collection?.reference?.id
      ? getRequired(context.collectionIdsByOldIds, fileAsset.collection.reference.id, "collection")
      : undefined;

    const fileMsg = `Importing: file for asset ${fileAsset.id} (${chalk.yellow(fileAsset.title)}) with file name ${
      chalk.yellowBright(fileAsset.file_name)
    }`;
    logInfo(logOptions, "verbose", fileMsg);

    const fileRef = await client
      .uploadBinaryFile()
      .withData({
        filename: fileAsset.file_name,
        contentType: fileAsset.type,
        binaryData: binary,
      })
      .toPromise()
      .then(res => res.data);

    logInfo(logOptions, "verbose", `Importing: asset ${fileAsset.id} (${chalk.yellow(fileAsset.title)})`);

    const projectAsset = await client
      .addAsset()
      .withData(() => ({
        title: fileAsset.title,
        codename: fileAsset.codename,
        ...folderId ? { folder: { id: folderId } } : undefined,
        file_reference: fileRef,
        ...collectionId ? { collection: { reference: { id: collectionId } } } : undefined,
        external_id: fileAsset.external_id || fileAsset.codename,
        descriptions: fileAsset.descriptions.map(d => {
          const newLanguageId = getRequired(context.languageIdsByOldIds, d.language.id, "language");

          return ({ description: d.description, language: { id: newLanguageId } });
        }),
      }))
      .toPromise()
      .then(res => res.data);

    return [fileAsset.id, projectAsset.id] as const;
  };
