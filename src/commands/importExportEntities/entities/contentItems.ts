import { ContentItemContracts, ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logInfo, LogOptions } from "../../../log.js";
import { zip } from "../../../utils/array.js";
import { serially } from "../../../utils/requests.js";
import { ReplaceReferences } from "../../../utils/types.js";
import { getRequired } from "../../import/utils.js";
import { EntityDefinition, ImportContext } from "../entityDefinition.js";

type Item = ReplaceReferences<ContentItemContracts.IContentItemModelContract>;

export const contentItemsEntity: EntityDefinition<ReadonlyArray<Item>> = {
  name: "contentItems",
  displayName: "contentItems",
  fetchEntities: client =>
    client.listContentItems().toAllPromise().then(res => res.data.items.map(i => i._raw as Item)),
  serializeEntities: collections => JSON.stringify(collections),
  deserializeEntities: JSON.parse,
  importEntities: async (client, fileItems, context, logOptions) => {
    const projectItems = await serially(fileItems.map(createImportItemFetcher(client, context, logOptions)));

    return {
      ...context,
      contentItemContextByOldIds: new Map(
        zip(fileItems, projectItems)
          .map(([fItem, pItem]) => [fItem.id, { selfId: pItem.id, oldTypeId: fItem.type.id }]),
      ),
    };
  },
  cleanEntities: async (client, items) => {
    if (!items.length) {
      return;
    }

    await serially(items.map(item => () =>
      client.deleteContentItem()
        .byItemId(item.id)
        .toPromise()
    ));
  },
};

const createImportItemFetcher =
  (client: ManagementClient, context: ImportContext, logOptions: LogOptions) => (fileItem: Item) => () => {
    logInfo(logOptions, "verbose", `Importing: item ${fileItem.id} (${chalk.yellow(fileItem.name)})`);

    return client
      .addContentItem()
      .withData({
        ...fileItem,
        type: { id: getRequired(context.contentTypeContextByOldIds, fileItem.type.id, "content type").selfId },
        collection: { id: getRequired(context.collectionIdsByOldIds, fileItem.collection.id, "collection") },
        external_id: fileItem.external_id ?? fileItem.codename,
        sitemap_locations: [],
      } as ContentItemContracts.IAddContentItemPostContract) // The sitemap_locations is missing in the type
      .toPromise()
      .then(res => res.rawData);
  };
