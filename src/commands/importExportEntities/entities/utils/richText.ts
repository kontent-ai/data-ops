import { ImportContext } from "../../entityDefinition.js";

export const replaceRichTextReferences = (
  richText: string,
  context: ImportContext,
  componentIds: ReadonlySet<string>,
): string =>
  richText
    .replaceAll(assetRegex, (_, oldAssetId /* from the regex capture group*/) => {
      const newAssetId = context.assetIdsByOldIds.get(oldAssetId);
      if (!newAssetId) {
        console.warn(`Found asset id "${oldAssetId}" in rich text that doesn't exist.`);
        return `${assetExternalIdAttributeName}="${oldAssetId}"`;
      }

      return `${assetAtributeName}="${newAssetId}"`;
    })
    .replaceAll(itemOrComponentRegex, (_, oldItemId /* from the regex capture group*/) => {
      // Don't change component ids
      if (componentIds.has(oldItemId)) {
        return `${itemOrComponentAttributeName}="${oldItemId}"`;
      }

      const newItemId = context.contentItemContextByOldIds.get(oldItemId);
      if (!newItemId) {
        console.warn(`Found item id "${oldItemId}" in rich text that doesn't exist.`);
        return `${itemExternalIdAttributeName}="${oldItemId}"`;
      }

      return `${itemOrComponentAttributeName}="${newItemId}"`;
    });

const uuidRegex = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const assetAtributeName = "data-asset-id";
const itemOrComponentAttributeName = "data-id";

const assetRegex = new RegExp(`${assetAtributeName}="(${uuidRegex})"`, "gi");
const itemOrComponentRegex = new RegExp(`${itemOrComponentAttributeName}="(${uuidRegex})"`, "gi");

const assetExternalIdAttributeName = "data-asset-external-id";
const itemExternalIdAttributeName = "data-external-id";
