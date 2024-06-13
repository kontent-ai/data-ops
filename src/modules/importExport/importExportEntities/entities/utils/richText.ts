import {
  assetAttributeName,
  assetExternalIdAttributeName,
  assetRegex,
  itemExternalIdAttributeName,
  itemExternalIdLinkAttributeName,
  itemLinkAttributeName,
  itemLinkRegex,
  itemOrComponentAttributeName,
  itemOrComponentRegex,
} from "../../../../../constants/richText.js";
import { LogOptions, logWarning } from "../../../../../log.js";
import { createAssetExternalId, createItemExternalId } from "../../../../../utils/externalIds.js";
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
        `${assetAttributeName}="${id}"`, eId =>
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
  logOptions: LogOptions,
): string =>
  replaceRichTextReferences({
    richText,
    replaceAssetId: (oldAssetId, asInternalId, asExternalId) => {
      const newAssetId = context.assetIdsByOldIds.get(oldAssetId);
      if (!newAssetId) {
        logWarning(logOptions, "standard", `Found asset id "${oldAssetId}" of a non-existent asset in the rich text.`);
        return asExternalId(createAssetExternalId(context.oldAssetCodenamesByIds.get(oldAssetId) ?? oldAssetId));
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
        logWarning(logOptions, "standard", `Found item id "${oldItemId}" of a non-existent item in the rich text.`);
        return asExternalId(createItemExternalId(context.oldContentItemCodenamesByIds.get(oldItemId) ?? oldItemId));
      }

      return asInternalId(newItemId.selfId);
    },
    replaceItemLinkId: (oldItemId, asInternalId, asExternalId) => {
      const newItemId = context.contentItemContextByOldIds.get(oldItemId);
      if (!newItemId) {
        logWarning(logOptions, "standard", `Found a link to a non-existent item id "${oldItemId}" in the rich text.`);
        return asExternalId(context.oldContentItemCodenamesByIds.get(oldItemId) ?? oldItemId);
      }

      return asInternalId(newItemId.selfId);
    },
  });
