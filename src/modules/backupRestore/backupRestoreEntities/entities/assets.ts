import stream from "node:stream";
import type { AssetContracts, ManagementClient } from "@kontent-ai/management-sdk";
import type archiver from "archiver";
import chalk from "chalk";
import type { StreamZipAsync } from "node-stream-zip";

import { type LogOptions, logInfo, logWarning } from "../../../../log.js";
import { serially } from "../../../../utils/requests.js";
import type { ReplaceReferences } from "../../../../utils/types.js";
import { getRequired } from "../../utils/utils.js";
import type { EntityDefinition, RestoreContext } from "../entityDefinition.js";

const assetsBinariesFolderName = "assets";
const createFileName = (asset: AssetContracts.IAssetModelContract) =>
  `${assetsBinariesFolderName}/${asset.id}-${asset.file_name}`;

type AssetWithElements = ReplaceReferences<AssetContracts.IAssetModelContract> & {
  readonly elements: ReadonlyArray<unknown>;
};

export const assetsEntity = {
  name: "assets",
  displayName: "assets",
  fetchEntities: (client) =>
    client
      .listAssets()
      .toAllPromise()
      .then((res) => res.data.items.map((a) => a._raw as AssetWithElements)),
  serializeEntities: JSON.stringify,
  addOtherFiles: async (assets, archive, secureAssetDeliveryKey, logOptions) => {
    await serially(
      assets.map((a) => () => saveAsset(archive, logOptions, a, secureAssetDeliveryKey)),
    );
  },
  deserializeEntities: JSON.parse,
  importEntities: async (client, { entities: fileAssets, context, logOptions, zip }) => {
    const fileAssetsWithElements = fileAssets.filter((a) => !!a.elements.length);
    if (fileAssetsWithElements.length) {
      logWarning(
        logOptions,
        "verbose",
        `It is not possible to restore assets with elements at the moment. The following assets will be imported without their elements: ${fileAssetsWithElements
          .map((a) => a.id)
          .join(", ")}.`,
        "If you want the elements, import them using a management API after the assets are imported.",
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
      oldAssetCodenamesByIds: new Map(fileAssets.map((a) => [a.id, a.codename])),
    };
  },
  cleanEntities: async (client, assets) => {
    if (!assets.length) {
      return;
    }

    await serially(
      assets.map((asset) => () => client.deleteAsset().byAssetId(asset.id).toPromise()),
    );
  },
} as const satisfies EntityDefinition<ReadonlyArray<AssetWithElements>>;

const saveAsset = async (
  archive: archiver.Archiver,
  logOptions: LogOptions,
  asset: AssetContracts.IAssetModelContract,
  secureAssetDeliveryKey: string | undefined,
) => {
  logInfo(logOptions, "verbose", `Exporting: file ${chalk.yellow(asset.file_name)}.`);
  const options: RequestInit = {
    headers: secureAssetDeliveryKey
      ? { Authorization: `Bearer ${secureAssetDeliveryKey}` }
      : undefined,
  };
  const file = await fetch(`${asset.url}?q=100`, options)
    .then((res) => res.blob())
    .then((res) => res.stream());
  archive.append(stream.Readable.fromWeb(file), { name: createFileName(asset) });
};

const createImportAssetFetcher =
  (
    zip: StreamZipAsync,
    client: ManagementClient,
    context: RestoreContext,
    logOptions: LogOptions,
  ) =>
  (fileAsset: AssetWithElements) =>
  async (): Promise<readonly [string, string]> => {
    const binary = await zip.entryData(createFileName(fileAsset));

    const folderId = fileAsset.folder?.id
      ? getRequired(context.assetFolderIdsByOldIds, fileAsset.folder.id, "folder")
      : undefined;
    const collectionId = fileAsset.collection?.reference?.id
      ? getRequired(context.collectionIdsByOldIds, fileAsset.collection.reference.id, "collection")
      : undefined;

    const fileMsg = `Importing: file for asset ${fileAsset.id} (${chalk.yellow(fileAsset.title)}) with file name ${chalk.yellowBright(
      fileAsset.file_name,
    )}`;
    logInfo(logOptions, "verbose", fileMsg);

    const fileRef = await client
      .uploadBinaryFile()
      .withData({
        filename: fileAsset.file_name,
        contentType: fileAsset.type,
        binaryData: binary,
      })
      .toPromise()
      .then((res) => res.data);

    logInfo(
      logOptions,
      "verbose",
      `Importing: asset ${fileAsset.id} (${chalk.yellow(fileAsset.title)})`,
    );

    const projectAsset = await client
      .addAsset()
      .withData(() => ({
        title: fileAsset.title,
        codename: fileAsset.codename,
        elements: [], // Elements are currently not supported
        ...(folderId ? { folder: { id: folderId } } : undefined),
        file_reference: fileRef,
        ...(collectionId ? { collection: { reference: { id: collectionId } } } : undefined),
        external_id: fileAsset.external_id || fileAsset.codename,
        descriptions: fileAsset.descriptions.map((d) => {
          const newLanguageId = getRequired(context.languageIdsByOldIds, d.language.id, "language");

          return { description: d.description, language: { id: newLanguageId } };
        }),
      }))
      .toPromise()
      .then((res) => res.data);

    return [fileAsset.id, projectAsset.id] as const;
  };
