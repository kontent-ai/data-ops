import { PreviewContracts } from "@kontent-ai/management-sdk";

import { EntityDefinition } from "../entityDefinition.js";

export const previewUrlsExportEntity: EntityDefinition<PreviewContracts.IPreviewConfigurationContract> = {
  name: "previewUrls",
  fetchEntities: client => client.getPreviewConfiguration().toPromise().then(res => res.rawData),
  serializeEntities: collections => JSON.stringify(collections),
  importEntities: () => {
    throw new Error("Not supported yet.");
  },
  deserializeEntities: () => {
    throw new Error("Not supported yet.");
  },
};
