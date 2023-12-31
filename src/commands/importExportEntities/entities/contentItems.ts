import { ContentItemContracts, ManagementClient } from "@kontent-ai/management-sdk";

import { zip } from "../../../utils/array.js";
import { serially } from "../../../utils/requests.js";
import { getRequired } from "../../import/utils.js";
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
        contentItemContextByOldIds: new Map(
          zip(fileItems, projectItems)
            .map(([fItem, pItem]) => [fItem.id, { selfId: pItem.id, oldTypeId: fItem.type.id ?? "" }]),
        ),
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
        type: { id: getRequired(context.contentTypeContextByOldIds, fileItem.type.id ?? "", "content type").selfId },
        collection: { id: getRequired(context.collectionIdsByOldIds, fileItem.collection.id ?? "", "collection") },
        external_id: fileItem.external_id ?? fileItem.codename,
      })
      .toPromise()
      .then(res => res.rawData);
