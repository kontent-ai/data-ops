import { ContentItemContracts, ManagementClient } from "@kontent-ai/management-sdk";

import { zip } from "../../../utils/array.js";
import { serially } from "../../../utils/requests.js";
import { EntityDefinition, ImportContext } from "../entityDefinition.js";

export const contentItemsExportEntity: EntityDefinition<ReadonlyArray<ContentItemContracts.IContentItemModelContract>> =
  {
    name: "contentItems",
    fetchEntities: client => client.listContentItems().toAllPromise().then(res => res.data.items.map(i => i._raw)),
    serializeEntities: collections => JSON.stringify(collections),
    deserializeEntities: JSON.parse,
    importEntities: async (client, fileItems, context) => {
      const projectItems = await serially(fileItems.map(createImportItemFetcher(client, context)));

      return {
        ...context,
        contentItemIdsByOldIds: new Map(zip(fileItems, projectItems).map(([fItem, pItem]) => [fItem.id, pItem.id])),
      };
    },
  };

const createImportItemFetcher =
  (client: ManagementClient, context: ImportContext) =>
  (fileItem: ContentItemContracts.IContentItemModelContract) =>
  () =>
    client
      .addContentItem()
      .withData({
        ...fileItem,
        type: { id: context.contentTypeIdsWithElementsByOldIds.get(fileItem.type.id ?? "")?.selfId },
        collection: { id: context.collectionIdsByOldIds.get(fileItem.collection.id ?? "") },
        external_id: fileItem.external_id ?? fileItem.codename,
      })
      .toPromise()
      .then(res => res.rawData);
