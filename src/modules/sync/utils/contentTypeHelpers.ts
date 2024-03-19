import { ContentTypeContracts, ContentTypeElements, ContentTypeSnippetContracts } from "@kontent-ai/management-sdk";
import { PortableTextInternalLink, PortableTextObject, traversePortableText } from "@kontent-ai/rich-text-resolver";

export const getGuidelinesElements = (
  types: ContentTypeContracts.IContentTypeContract[] | ContentTypeSnippetContracts.IContentTypeSnippetContract[],
) =>
  types.flatMap(type =>
    type.elements.filter(element => element.type === "guidelines")
  ) as unknown as ContentTypeElements.IGuidelinesElement[];

export const getAssetElements = (
  types: ContentTypeContracts.IContentTypeContract[] | ContentTypeSnippetContracts.IContentTypeSnippetContract[],
) =>
  types.flatMap(type =>
    type.elements.filter(element => element.type === "asset")
  ) as ContentTypeElements.IAssetElement[];

export const getLinkedItemsElements = (
  types: ContentTypeContracts.IContentTypeContract[] | ContentTypeSnippetContracts.IContentTypeSnippetContract[],
) =>
  types.flatMap(type =>
    type.elements.filter(element => element.type === "modular_content")
  ) as unknown as ContentTypeElements.ILinkedItemsElement[];

export const getRequiredAssetsIds = (
  assetElements: ContentTypeElements.IAssetElement[],
  portableTextGuidelines: ReadonlyArray<PortableTextObject[]>,
) => {
  const result = new Set<string>();

  assetElements.forEach(asset => {
    asset.default?.global.value.forEach(a => {
      result.add(a.id as string);
    });
  });

  const traverseCallback = (object: PortableTextObject) => {
    if (object._type === "image") {
      result.add(object.asset._ref);
    }

    return object;
  };

  portableTextGuidelines.map(guideline => guideline.map(g => traversePortableText(g, traverseCallback)));

  return result;
};

export const getRequiredItemIds = (
  linkedItems: ContentTypeElements.ILinkedItemsElement[],
  portableTextGuidelines: ReadonlyArray<PortableTextObject[]>,
) => {
  const result = new Set<string>();

  linkedItems.forEach(l => {
    l.default?.global.value.forEach(i => {
      result.add(i.id as string);
    });
  });

  const traverseCallback = (object: PortableTextObject) => {
    if (object._type === "block") {
      object.markDefs?.map(m => {
        if (m._type === "internalLink") {
          result.add((m as PortableTextInternalLink).reference._ref);
        }
      });
    }

    return object;
  };

  portableTextGuidelines.forEach(guideline => guideline.forEach(g => traversePortableText(g, traverseCallback)));

  return result;
};
