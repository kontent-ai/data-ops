import type { ContentTypeElements } from "@kontent-ai/management-sdk";
import {
  type PortableTextItemLink,
  type PortableTextObject,
  transformToPortableText,
} from "@kontent-ai/rich-text-resolver";

import { notNullOrUndefined } from "../../../utils/typeguards.js";
import {
  getAssetReferences,
  getItemReferences,
  type OriginalReference,
} from "../diff/guidelinesRichText.js";
import type {
  SyncAssetElement,
  SyncLinkedItemsElement,
  SyncTypeElement,
} from "../types/syncModel.js";

const resolveAssetIdsDomHtmlNode = (node: PortableTextObject): ReadonlyArray<string> => {
  if (node._type === "image") {
    return node.asset.referenceType === "id" ? [node.asset._ref] : [];
  }

  if (node._type === "block") {
    return (
      node.markDefs
        ?.filter((a) => a._type === "link" && "data-asset-id" in a)
        .map((a) => (a as unknown as { "data-asset-id": string })["data-asset-id"]) ?? []
    );
  }

  if (node.children && Array.isArray(node.children)) {
    return node.children.flatMap(resolveAssetIdsDomHtmlNode);
  }

  return [];
};

const resolveItemIdsDomHtmlNode = (node: PortableTextObject): ReadonlyArray<string> => {
  if (node._type === "componentOrItem") {
    return node.dataType === "item" ? [node.componentOrItem._ref] : [];
  }
  if (node._type === "block") {
    return (
      node.markDefs
        ?.filter((a) => a._type === "contentItemLink")
        .map((a) => (a as PortableTextItemLink).contentItemLink._ref) ?? []
    );
  }

  if (node.children && Array.isArray(node.children)) {
    return node.children.flatMap(resolveItemIdsDomHtmlNode);
  }

  return [];
};

export const getRequiredIds = (elements: ReadonlyArray<ContentTypeElements.Element>) => {
  const assetElements = elements.filter(
    (element): element is ContentTypeElements.IAssetElement => element.type === "asset",
  );
  // Use typeguard once types in SDKs are fixed
  const guidelinesElements = elements.filter(
    (element) => element.type === "guidelines",
  ) as unknown as ContentTypeElements.IGuidelinesElement[];
  const linkedItemElements = elements.filter(
    (element): element is ContentTypeElements.ILinkedItemsElement =>
      // currently, the subpages type in SDK does not contain default property, therefore subpages are narrowed to ILinkedItemsElement.
      // since the subpages element is the same as the linked items element apart from the type property.
      element.type === "modular_content" || element.type === "subpages",
  );

  const parsedGuidelines = guidelinesElements.map((g) => transformToPortableText(g.guidelines));

  const assetIds = getRequiredItemOrAssetIds(
    assetElements,
    parsedGuidelines,
    resolveAssetIdsDomHtmlNode,
  );
  const itemIds = getRequiredItemOrAssetIds(
    linkedItemElements,
    parsedGuidelines,
    resolveItemIdsDomHtmlNode,
  );

  return { assetIds, itemIds };
};

const getRequiredItemOrAssetIds = (
  elements: ContentTypeElements.ILinkedItemsElement[] | ContentTypeElements.IAssetElement[],
  parsedGuidelines: PortableTextObject[][],
  resolveDomTextNode: (node: PortableTextObject) => ReadonlyArray<string>,
) => {
  const elementsIds = new Set(
    elements.flatMap((el) => el.default?.global.value.map((ref) => ref.id as string) ?? []),
  );
  const idsFromGuidelines = parsedGuidelines.flatMap((guideline) =>
    guideline.flatMap(resolveDomTextNode),
  );

  return new Set([...elementsIds, ...idsFromGuidelines]);
};

export const getRequiredCodenames = (elements: ReadonlyArray<SyncTypeElement>) => {
  const assetElements = elements.filter(
    (element): element is SyncAssetElement => element.type === "asset",
  );
  // Use typeguard once types in SDKs are fixed
  const guidelinesElements = elements.filter(
    (element) => element.type === "guidelines",
  ) as ContentTypeElements.IGuidelinesElement[];
  const linkedItemElements = elements.filter(
    (element): element is SyncLinkedItemsElement =>
      // currently, the subpages type in SDK does not contain default property, therefore subpages are narrowed to ILinkedItemsElement.
      // since the subpages element is the same as the linked items element apart from the type property.
      element.type === "modular_content" || element.type === "subpages",
  );

  const guidelines = guidelinesElements.map((g) => g.guidelines);

  const assetCodenames = getRequiredItemOrAssetCodenames(
    assetElements,
    getAssetReferences,
    guidelines,
  );
  const itemCodenames = getRequiredItemOrAssetCodenames(
    linkedItemElements,
    getItemReferences,
    guidelines,
  );

  return { assetCodenames, itemCodenames };
};

const getRequiredItemOrAssetCodenames = (
  elements: {
    readonly default?: { readonly global: { readonly value: ReadonlyArray<{ codename: string }> } };
  }[],
  getFromGuidelines: (guidelines: string) => readonly OriginalReference[],
  guidelines: string[],
) => {
  const elementsIds = new Set(
    elements
      .flatMap((e) => e.default?.global.value.map((r) => r.codename))
      .filter(notNullOrUndefined),
  );

  const idsFromGuidelines = guidelines
    .flatMap((guideline) => getFromGuidelines(guideline).flatMap((g) => g.codename))
    .filter(notNullOrUndefined);

  return new Set([...elementsIds, ...idsFromGuidelines]);
};
