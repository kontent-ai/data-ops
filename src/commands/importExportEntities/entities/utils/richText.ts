import { ImportContext } from "../../entityDefinition.js";

type ReferenceReplacer = <T extends string>(
  foundId: string,
  asInternalId: (id: string) => T,
  asExternalId: (id: string) => T,
) => T;

type ReplaceRichTextReferencesParams = Readonly<{
  richText: string;
  replaceAssetId: ReferenceReplacer;
  replaceItemId: ReferenceReplacer;
  replaceItemLinkId: ReferenceReplacer;
}>;

export const replaceRichTextReferences = (params: ReplaceRichTextReferencesParams): string =>
  params.richText
    .replaceAll(assetRegex, (_, oldAssetId /* from the regex capture group*/) =>
      params.replaceAssetId(oldAssetId, id =>
        `${assetAtributeName}="${id}"`, eId =>
        `${assetExternalIdAttributeName}="${eId}"`))
    .replaceAll(itemOrComponentRegex, (_, oldItemId /* from the regex capture group*/) =>
      params.replaceItemId(oldItemId, id =>
        `${itemOrComponentAttributeName}="${id}"`, eId =>
        `${itemExternalIdAttributeName}="${eId}"`))
    .replaceAll(itemLinkRegex, (_, oldItemId /* from the regex capture group*/) =>
      params.replaceItemLinkId(oldItemId, id =>
        `${itemLinkAttributeName}="${id}"`, eId =>
        `${itemExternalIdLinkAttributeName}="${eId}"`));

export const replaceImportRichTextReferences = (
  richText: string,
  context: ImportContext,
  componentIds: ReadonlySet<string>,
): string =>
  replaceRichTextReferences({
    richText,
    replaceAssetId: (oldAssetId, asInternalId, asExternalId) => {
      const newAssetId = context.assetIdsByOldIds.get(oldAssetId);
      if (!newAssetId) {
        console.warn(`Found asset id "${oldAssetId}" in rich text that doesn't exist.`);
        return asExternalId(oldAssetId);
      }

      return asInternalId(newAssetId);
    },
    replaceItemId: (oldItemId, asInternalId, asExternalId) => {
      // Don't change component ids
      if (componentIds.has(oldItemId)) {
        return asInternalId(oldItemId);
      }

      const newItemId = context.contentItemContextByOldIds.get(oldItemId);
      if (!newItemId) {
        console.warn(`Found item id "${oldItemId}" in rich text that doesn't exist.`);
        return asExternalId(oldItemId);
      }

      return asInternalId(newItemId.selfId);
    },
    replaceItemLinkId: (oldItemId, asInternalId, asExternalId) => {
      const newItemId = context.contentItemContextByOldIds.get(oldItemId);
      if (!newItemId) {
        console.warn(`Found a link to item id "${oldItemId}" in rich text that doesn't exist.`);
        return asExternalId(oldItemId);
      }

      return asInternalId(newItemId.selfId);
    },
  });

const uuidRegex = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const assetAtributeName = "data-asset-id";
const itemOrComponentAttributeName = "data-id";
const itemLinkAttributeName = "data-item-id";

const assetRegex = new RegExp(`${assetAtributeName}="(${uuidRegex})"`, "gi");
const itemOrComponentRegex = new RegExp(`${itemOrComponentAttributeName}="(${uuidRegex})"`, "gi");
const itemLinkRegex = new RegExp(`${itemLinkAttributeName}="(${uuidRegex})"`, "gi");

const assetExternalIdAttributeName = "data-asset-external-id";
const itemExternalIdAttributeName = "data-external-id";
const itemExternalIdLinkAttributeName = "data-item-external-id";
