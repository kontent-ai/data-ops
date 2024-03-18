export const uuidRegex = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export const assetAttributeName = "data-asset-id";
export const itemOrComponentAttributeName = "data-id";
export const itemLinkAttributeName = "data-item-id";

export const assetRegex = new RegExp(`${assetAttributeName}="(${uuidRegex})"`, "gi");
export const itemOrComponentRegex = new RegExp(`${itemOrComponentAttributeName}="(${uuidRegex})"`, "gi");
export const itemLinkRegex = new RegExp(`${itemLinkAttributeName}="(${uuidRegex})"`, "gi");

export const assetExternalIdAttributeName = "data-asset-external-id";
export const itemExternalIdAttributeName = "data-external-id";
export const itemExternalIdLinkAttributeName = "data-item-external-id";
