import { AssetContracts } from "@kontent-ai/management-sdk";
import JSZip from "jszip";

import { serially } from "../../../utils/requests.js";
import { EntityDefinition } from "../entityDefinition.js";

export const assetsExportEntity: EntityDefinition<ReadonlyArray<AssetContracts.IAssetModelContract>> = {
  name: "assets",
  fetchEntities: client => client.listAssets().toAllPromise().then(res => res.data.items.map(a => a._raw)),
  serializeEntities: JSON.stringify,
  addOtherFiles: async (assets, zip) => {
    const assetsZip = zip.folder("assets");
    if (!assetsZip) {
      throw new Error("Cannot create a folder in zip.");
    }
    await serially(assets.map(a => () => saveAsset(assetsZip, a)))
  },
  importEntities: () => { throw new Error("Not supported yet.")},
  deserializeEntities: () => { throw new Error("Not supported yet.")},
};

const saveAsset = async (zip: JSZip, asset: AssetContracts.IAssetModelContract) => {
  const file = await fetch(asset.url).then(res => res.blob()).then(res => res.arrayBuffer());
  zip.file(asset.file_name, file);
};
