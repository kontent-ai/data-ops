import {
  AssetContracts,
  ContentItemContracts,
  ContentTypeContracts,
  ContentTypeElements,
  ContentTypeSnippetContracts,
  SharedContracts,
  TaxonomyContracts,
} from "@kontent-ai/management-sdk";

import { replaceRichTextReferences } from "../../../commands/importExportEntities/entities/utils/richText.js";
import { logWarning } from "../../../log.js";
import { omit } from "../../../utils/object.js";

export type ReplaceReferences<T> = T extends { id?: string; codename?: string; externalId?: string } ?
    & { codename: string }
    & {
      [K in keyof Omit<T, "id" | "codename">]: ReplaceReferences<T[K]>;
    }
  : T extends ReadonlyArray<infer R> ? ReadonlyArray<ReplaceReferences<R>>
  : T;

type CoreElement<E> = Omit<E, "content_group">;
type ContentReference = { default?: { global: { value: { codename: string; external_id: string }[] } } };

type SyncCustomElement = CoreElement<ReplaceReferences<ContentTypeElements.ICustomElement>>;
type SyncMultipleChoiceElement = CoreElement<ReplaceReferences<ContentTypeElements.IMultipleChoiceElement>>;
type SyncAssetElement =
  & Omit<CoreElement<ReplaceReferences<ContentTypeElements.IAssetElement>>, "default">
  & ContentReference;
type SyncRichTextElement = CoreElement<ReplaceReferences<ContentTypeElements.IRichTextElement>>;
type SyncTaxonomyElement = Omit<CoreElement<ReplaceReferences<ContentTypeElements.ITaxonomyElement>>, "name"> & {
  name: string;
};
type SyncLinkedItemsElement =
  & Omit<CoreElement<ReplaceReferences<ContentTypeElements.ILinkedItemsElement>>, "default">
  & ContentReference;
type SyncGuidelinesElement = CoreElement<ReplaceReferences<ContentTypeElements.IGuidelinesElement>>;

const findContentType = (
  typeReference: SharedContracts.IReferenceObjectContract,
  contentTypes: ReadonlyArray<ContentTypeContracts.IContentTypeContract>,
) => {
  const type = contentTypes.find(t => typeReference.id === t.id);

  if (!type) {
    throw new Error(`Could not find type with id ${typeReference.id}`);
  }

  return { codename: type.codename };
};

export const transformCustomElement = (
  element: ContentTypeElements.ICustomElement,
  snippet: ContentTypeSnippetContracts.IContentTypeSnippetContract,
): SyncCustomElement => {
  const syncAllowedElements = element.allowed_elements?.map(element => ({
    codename: snippet.elements.find(el => el.id === element.id!)?.codename!,
  }));

  return {
    ...omit(element, ["id"]),
    allowed_elements: syncAllowedElements,
    codename: element.codename as string,
    external_id: element.external_id ?? element.id,
  };
};

export const transformMultipleChoiceElement = (
  element: ContentTypeElements.IMultipleChoiceElement,
): SyncMultipleChoiceElement => {
  const defaultOptionId = element.default?.global.value.map(o => o.id);
  const defaultOptionCodename = defaultOptionId?.map(id => element.options.find(option => option.id === id))!;
  const defaultOption = { global: { value: [{ codename: defaultOptionCodename[0]?.codename ?? "" }] } };

  const options = element.options.map(option => ({
    ...omit(option, ["id"]),
    codename: option.codename as string,
    external_id: option.external_id ?? option.id,
  }));

  return {
    ...omit(element, ["id"]),
    default: defaultOption,
    options,
    codename: element.codename as string,
    external_id: element.external_id ?? element.id,
  };
};

export const transformAssetElement = (
  element: ContentTypeElements.IAssetElement,
  assets: ReadonlyArray<AssetContracts.IAssetModelContract>,
): SyncAssetElement => {
  const defaultAssetsIds = element.default?.global.value.map(a => a.id);
  const defaultAssetsReferences = defaultAssetsIds?.map(id => {
    const asset = assets.find(asset => asset.id === id);

    return {
      codename: asset?.codename ?? "",
      external_id: asset?.external_id ?? asset?.id ?? "",
    };
  })!;

  const defaultAssets = { global: { value: defaultAssetsReferences } };

  return {
    ...omit(element, ["id"]),
    default: defaultAssets,
    codename: element.codename as string,
    external_id: element.external_id ?? element.id,
  };
};

export const transformRichText = (
  element: ContentTypeElements.IRichTextElement,
  contentTypes: ReadonlyArray<ContentTypeContracts.IContentTypeContract>,
): SyncRichTextElement => {
  const allowedContentTypes = element.allowed_content_types?.map(c => findContentType(c, contentTypes));
  const allowedItemLinkTypes = element.allowed_item_link_types?.map(c => findContentType(c, contentTypes));

  return {
    ...omit(element, ["id"]),
    allowed_content_types: allowedContentTypes,
    allowed_item_link_types: allowedItemLinkTypes,
    codename: element.codename as string,
    external_id: element.external_id ?? element.id,
  };
};

type TermType = {
  id: string;
  codename: string;
  external_id: string;
};

export const transformTaxonomyElement = (
  element: ContentTypeElements.ITaxonomyElement,
  taxonomies: ReadonlyArray<TaxonomyContracts.ITaxonomyContract>,
): SyncTaxonomyElement => {
  const taxonomyGroup = taxonomies.find(t => t.id === element.taxonomy_group.id);
  if (!taxonomyGroup) {
    throw new Error(`Could not find taxonomy group with id ${element.taxonomy_group.id}`);
  }
  const taxonomyGroupReference = { codename: taxonomyGroup.codename };

  const travserseTerms = (term: TaxonomyContracts.ITaxonomyContract): TermType[] => [{
    id: term.id,
    codename: term.codename,
    external_id: term.external_id ?? term.id,
  }, ...term.terms.flatMap(travserseTerms)];

  const terms = taxonomyGroup.terms.flatMap(travserseTerms);
  const defaultTermsReferences = element.default?.global.value.map(t => {
    const term = terms.find(term => term.id === t.id);
    if (!term) {
      throw new Error(`Could not find taxonomy term with id ${t.id}`);
    }

    return { codename: term.codename };
  });
  const defaultTerms = defaultTermsReferences ? { global: { value: defaultTermsReferences } } : undefined;

  return {
    ...omit(element, ["id"]),
    taxonomy_group: taxonomyGroupReference,
    name: element.name as string,
    default: defaultTerms,
    codename: element.codename as string,
    external_id: element.external_id ?? element.id,
  };
};

export const transformLinkedItemsElement = (
  element: ContentTypeElements.ILinkedItemsElement,
  contentTypes: ReadonlyArray<ContentTypeContracts.IContentTypeContract>,
  items: ReadonlyArray<ContentItemContracts.IContentItemModelContract>,
): SyncLinkedItemsElement => {
  const allowedContentTypes = element.allowed_content_types?.map(type => findContentType(type, contentTypes));

  const defaultValues = element.default?.global.value.map(itemReference => {
    const item = items.find(i => i.id === itemReference.id);

    if (!item) {
      throw new Error(`Could not find item with id ${itemReference.id}`);
    }

    return {
      codename: item.codename,
      external_id: item.external_id ?? item.id,
    };
  });

  const defaultReference = defaultValues ? { global: { value: defaultValues } } : undefined;

  return {
    ...omit(element, ["id"]),
    allowed_content_types: allowedContentTypes,
    default: defaultReference,
    codename: element.codename as string,
    external_id: element.external_id ?? element.id,
  };
};

export const transformGuidelinesElement = (
  element: ContentTypeElements.IGuidelinesElement,
  assets: ReadonlyArray<AssetContracts.IAssetModelContract>,
  items: ReadonlyArray<ContentItemContracts.IContentItemModelContract>,
): SyncGuidelinesElement => {
  const guidelines = replaceRichTextReferences({
    richText: element.guidelines,
    replaceAssetId: (oldAssetId, _, asExternalId) => {
      const asset = assets.find(a => a.id === oldAssetId);
      if (!asset) {
        logWarning({}, "standard", `could not find given asset with id ${oldAssetId}`);
        return asExternalId(oldAssetId);
      }
      return asExternalId((asset.external_id as string | undefined) ?? oldAssetId);
    },
    replaceItemId: (oldItemId, _, asExternalId) => {
      const item = items.find(i => i.id === oldItemId);
      if (!item) {
        logWarning({}, "standard", `could not find given item with id ${oldItemId}`);
        return asExternalId(oldItemId);
      }
      return asExternalId(item.external_id ?? oldItemId);
    },
    replaceItemLinkId: (oldItemId, _, asExternalId) => {
      const item = items.find(i => i.id === oldItemId);
      if (!item) {
        logWarning({}, "standard", `could not find given item with id ${oldItemId}`);
        return asExternalId(oldItemId);
      }
      return asExternalId(item.external_id ?? oldItemId);
    },
  });
  
  return {
    ...omit(element, ["id"]),
    guidelines,
    codename: element.codename as string,
    external_id: element.external_id ?? element.id,
  };
};
