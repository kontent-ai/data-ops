import { ImportContext } from "../../entityDefinition.js";

export const replaceRichTextReferences = (richText: string, context: ImportContext): string =>
  richText
    .replaceAll(assetRegex, (_, assetId) => {
      const newAssetId = context.assetIdsByOldIds.get(assetId);
      if (!newAssetId) {
        console.warn(`Found asset id "${assetId}" in rich text that doesn't exist.`);
      }

      return `${assetAtributeName}="${newAssetId}"`;
    })
    .replaceAll(itemRegex, (_, itemId) => {
      const newItemId = context.contentItemIdsByOldIds.get(itemId);
      if (!newItemId) {
        console.warn(`Found item id "${itemId}" in rich text that doesn't exist.`);
      }

      return `${itemAttributeName}="${newItemId}"`;
    });

const uuidRegex = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const assetAtributeName = "data-asset-id";
const itemAttributeName = "data-id";

const assetRegex = new RegExp(`${assetAtributeName}="(${uuidRegex})"`, "gi");
const itemRegex = new RegExp(`${itemAttributeName}="(${uuidRegex})"`, "gi");
