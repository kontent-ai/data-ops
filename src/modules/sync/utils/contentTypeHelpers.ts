import { ContentTypeElements } from "@kontent-ai/management-sdk";
import {
  DomHtmlNode,
  DomNode,
  nodeParse,
  ParseResult,
  ResolveDomHtmlNodeType,
  ResolveDomTextNodeType,
  transformToJson,
} from "@kontent-ai/rich-text-resolver";

import { notNullOrUndefined } from "../../../utils/typeguards.js";
import { getAssetReferences, getItemReferences, OriginalReference } from "../diff/guidelinesRichText.js";
import { SyncAssetElement, SyncLinkedItemsElement, SyncTypeElement } from "../types/syncModel.js";

const resolveAssetIdsDomHtmlNode: ResolveDomHtmlNodeType = (node, traverse) => {
  switch (node.tagName) {
    case "figure":
      return node.attributes["data-asset-id"];
    case "a":
      return node.attributes["data-asset-id"];
    default: {
      return node.children.map(traverse);
    }
  }
};

const resolveItemIdsDomHtmlNode: ResolveDomHtmlNodeType = (node, traverse) => {
  switch (node.tagName) {
    case "a":
      return node.attributes["data-item-id"];
    default: {
      return node.children.flatMap(traverse);
    }
  }
};

const customResolveDomTextNode: ResolveDomTextNodeType = () => null;

export const getRequiredIds = (
  elements: ReadonlyArray<ContentTypeElements.Element>,
) => {
  const assetElements = elements.filter((element): element is ContentTypeElements.IAssetElement =>
    element.type === "asset"
  );
  // Use typeguard once types in SDKs are fixed
  const guidelinesElements = elements.filter(element =>
    element.type === "guidelines"
  ) as unknown as ContentTypeElements.IGuidelinesElement[];
  const linkedItemElements = elements.filter((element): element is ContentTypeElements.ILinkedItemsElement =>
    // currently, the subpages type in SDK does not contain default property, therefore subpages are narrowed to ILinkedItemsElement.
    // since the subpages element is the same as the linked items element apart from the type property.
    element.type === "modular_content" || element.type === "subpages"
  );

  const parsedGuidelines = guidelinesElements.map(g => nodeParse(g.guidelines));

  const assetIds = getRequiredItemOrAssetIds(assetElements, parsedGuidelines, resolveAssetIdsDomHtmlNode);
  const itemIds = getRequiredItemOrAssetIds(linkedItemElements, parsedGuidelines, resolveItemIdsDomHtmlNode);

  return { assetIds, itemIds };
};

const getRequiredItemOrAssetIds = (
  elements: ContentTypeElements.ILinkedItemsElement[] | ContentTypeElements.IAssetElement[],
  parsedGuidelines: ParseResult[],
  resolveDomTextNode: (node: DomHtmlNode, traverse: (node: DomNode) => unknown) => unknown,
) => {
  const elementsIds = new Set(elements.flatMap(el => el.default?.global.value.map(ref => ref.id as string) ?? []));

  const idsFromGuidelines = parsedGuidelines.reduce<string[]>((prev, guideline) =>
    [
      ...prev,
      transformToJson(guideline, {
        resolveDomTextNode: customResolveDomTextNode,
        resolveDomHtmlNode: resolveDomTextNode,
      }),
    ] as string[], []).flat(Infinity).filter(g => g);

  return new Set([...elementsIds, ...idsFromGuidelines]);
};

export const getRequiredCodenames = (
  elements: ReadonlyArray<SyncTypeElement>,
) => {
  const assetElements = elements.filter((element): element is SyncAssetElement => element.type === "asset");
  // Use typeguard once types in SDKs are fixed
  const guidelinesElements = elements.filter(element =>
    element.type === "guidelines"
  ) as ContentTypeElements.IGuidelinesElement[];
  const linkedItemElements = elements.filter((element): element is SyncLinkedItemsElement =>
    // currently, the subpages type in SDK does not contain default property, therefore subpages are narrowed to ILinkedItemsElement.
    // since the subpages element is the same as the linked items element apart from the type property.
    element.type === "modular_content" || element.type === "subpages"
  );

  const guidelines = guidelinesElements.map(g => g.guidelines);

  const assetCodenames = getRequiredItemOrAssetCodenames(assetElements, getAssetReferences, guidelines);
  const itemCodenames = getRequiredItemOrAssetCodenames(linkedItemElements, getItemReferences, guidelines);

  return { assetCodenames, itemCodenames };
};

const getRequiredItemOrAssetCodenames = (
  elements: { readonly default?: { readonly global: { readonly value: ReadonlyArray<{ codename: string }> } } }[],
  getFromGuidelines: (guidelines: string) => readonly OriginalReference[],
  guidelines: string[],
) => {
  const elementsIds = new Set(
    elements.flatMap(e => e.default?.global.value.map(r => r.codename)).filter(notNullOrUndefined),
  );

  const idsFromGuidelines = guidelines.flatMap(guideline => getFromGuidelines(guideline).flatMap(g => g.codename))
    .filter(notNullOrUndefined);

  return new Set([...elementsIds, ...idsFromGuidelines]);
};
