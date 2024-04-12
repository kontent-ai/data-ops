import {
  AssetContracts,
  ContentItemContracts,
  ContentTypeElements,
  SharedContracts,
  TaxonomyContracts,
} from "@kontent-ai/management-sdk";

import {
  assetExternalIdAttributeName,
  assetRegex,
  itemExternalIdAttributeName,
  itemExternalIdLinkAttributeName,
  itemLinkRegex,
} from "../../../constants/richText.js";
import { LogOptions, logWarning } from "../../../log.js";
import { throwError } from "../../../utils/error.js";
import { omit } from "../../../utils/object.js";
import { notNullOrUndefined } from "../../../utils/typeguards.js";
import { CodenameReference, Replace } from "../../../utils/types.js";
import { customAssetCodenameAttributeName, customItemLinkCodenameAttributeName } from "../../constants/syncRichText.js";
import { ContentTypeSnippetsWithUnionElements, ContentTypeWithUnionElements } from "../types/contractModels.js";
import {
  SyncAssetElement,
  SyncCustomElement,
  SyncGuidelinesElement,
  SyncLinkedItemsElement,
  SyncMultipleChoiceElement,
  SyncRichTextElement,
  SyncSubpagesElement,
  SyncTaxonomyElement,
  SyncTypeSnippetElement,
  SyncUrlSlugElement,
} from "../types/syncModel.js";
import { makeNestedExternalId } from "../utils/entitiesHelpers.js";

type ElementWithOldContentGroup<E extends { content_group?: CodenameReference }> = Replace<
  E,
  { content_group?: SharedContracts.IReferenceObjectContract }
>;

const handleContentType = (
  typeReference: SharedContracts.IReferenceObjectContract,
  contentTypes: ReadonlyArray<ContentTypeWithUnionElements>,
  warnMessage: string,
  logOptions: LogOptions,
) => {
  const foundType = contentTypes.find(t => typeReference.id == t.id);

  if (!foundType) {
    logWarning(
      logOptions,
      "standard",
      warnMessage,
    );
    return null;
  }

  return { codename: foundType.codename };
};

const replaceRichTextReferences = (
  richText: string,
  assets: ReadonlyArray<AssetContracts.IAssetModelContract>,
  items: ReadonlyArray<ContentItemContracts.IContentItemModelContract>,
  logOptions: LogOptions,
): string =>
  richText
    .replaceAll(assetRegex, (_, oldAssetId /* from the regex capture group*/) => {
      const asset = assets.find(a => a.id === oldAssetId);
      if (!asset) {
        logWarning(logOptions, "standard", `Found asset id "${oldAssetId}" of a non-existent asset in the rich text.`);
        return `${assetExternalIdAttributeName}="${oldAssetId}"`;
      }

      return `${customAssetCodenameAttributeName}="${asset.codename}" ${assetExternalIdAttributeName}="${
        (asset.external_id as string | undefined) ?? asset.id
      }"`;
    })
    .replaceAll(itemLinkRegex, (_, oldItemId /* from the regex capture group*/) => {
      const item = items.find(i => i.id === oldItemId);
      if (!item) {
        logWarning(logOptions, "standard", `Found asset id "${oldItemId}" of a non-existent asset in the rich text.`);
        return `${itemExternalIdAttributeName}="${oldItemId}"`;
      }

      return `${customItemLinkCodenameAttributeName}="${item.codename}" ${itemExternalIdLinkAttributeName}="${item.id}"`;
    });

export const transformCustomElement = (
  element: ContentTypeElements.ICustomElement,
  type: ContentTypeWithUnionElements | ContentTypeSnippetsWithUnionElements,
): ElementWithOldContentGroup<SyncCustomElement> => {
  const syncAllowedElements = element.allowed_elements?.map(element => ({
    codename: type.elements.find(el => el.id === element.id)?.codename
      ?? throwError(`Could not find codename of element ${element.id} in ${type.codename}`),
  }));

  return {
    ...omit(element, ["id"]),
    allowed_elements: syncAllowedElements,
    codename: element.codename as string,
    external_id: element.external_id ?? makeNestedExternalId(type.codename, element.codename as string),
  };
};

export const transformMultipleChoiceElement = (
  element: ContentTypeElements.IMultipleChoiceElement,
  type: ContentTypeWithUnionElements | ContentTypeSnippetsWithUnionElements,
): ElementWithOldContentGroup<SyncMultipleChoiceElement> => {
  const defaultOptionId = element.default?.global.value.map(o => o.id);

  const defaultOptionsCodenames = defaultOptionId?.map(id => ({
    codename: element.options.find(option => option.id === id)?.codename
      ?? throwError(`Could not find the codename of option with id ${id} in element ${element.codename}`),
  }));

  const defaultOptions = defaultOptionsCodenames?.length
    ? { global: { value: defaultOptionsCodenames } }
    : undefined;

  const options = element.options.map(option => ({
    ...omit(option, ["id"]),
    codename: option.codename as string,
    external_id: option.external_id ?? makeNestedExternalId(type.codename, option.codename as string),
  }));

  return {
    ...omit(element, ["id"]),
    default: defaultOptions,
    options,
    codename: element.codename as string,
    external_id: element.external_id ?? makeNestedExternalId(type.codename, element.codename as string),
  };
};

export const transformAssetElement = (
  element: ContentTypeElements.IAssetElement,
  type: ContentTypeWithUnionElements | ContentTypeSnippetsWithUnionElements,
  assets: ReadonlyArray<AssetContracts.IAssetModelContract>,
  logOptions: LogOptions,
): ElementWithOldContentGroup<SyncAssetElement> => {
  const defaultAssetsIds = element.default?.global.value.map(a => a.id);
  const defaultAssetsReferences = defaultAssetsIds?.map(id => {
    const asset = assets.find(asset => asset.id === id);

    if (!asset) {
      logWarning(
        logOptions,
        "standard",
        `could not find asset with id ${id} on element with codename ${element.codename}`,
      );
      return null;
    }

    return {
      codename: asset.codename,
      // external id should be optional in sdks.
      external_id: (asset.external_id as string | undefined) ?? asset.id,
    };
  }).filter(notNullOrUndefined);

  const defaultAssets = defaultAssetsReferences?.length ? { global: { value: defaultAssetsReferences } } : undefined;

  return {
    ...omit(element, ["id"]),
    default: defaultAssets,
    codename: element.codename as string,
    external_id: element.external_id ?? makeNestedExternalId(type.codename, element.codename as string),
  };
};

export const transformRichTextElement = (
  element: ContentTypeElements.IRichTextElement,
  type: ContentTypeWithUnionElements | ContentTypeSnippetsWithUnionElements,
  contentTypes: ReadonlyArray<ContentTypeWithUnionElements>,
  logOptions: LogOptions,
): ElementWithOldContentGroup<SyncRichTextElement> => {
  const allowedContentTypes = element.allowed_content_types?.map(type =>
    handleContentType(
      type,
      contentTypes,
      `could not find type with id ${type.id} to be used in allowed_content_types in element with codename ${element.codename}. Skipping it`,
      logOptions,
    )
  ).filter(notNullOrUndefined);
  const allowedItemLinkTypes = element.allowed_item_link_types?.map(type =>
    handleContentType(
      type,
      contentTypes,
      `could not find type with id ${type.id} to be used in allowed_item_link_types in element with codename ${element.codename}. Skipping it`,
      logOptions,
    )
  ).filter(notNullOrUndefined);

  return {
    ...omit(element, ["id"]),
    allowed_content_types: allowedContentTypes?.length ? allowedContentTypes : undefined,
    allowed_item_link_types: allowedItemLinkTypes?.length ? allowedItemLinkTypes : undefined,
    codename: element.codename as string,
    external_id: element.external_id ?? makeNestedExternalId(type.codename, element.codename as string),
  };
};

export const transformTaxonomyElement = (
  element: ContentTypeElements.ITaxonomyElement,
  type: ContentTypeWithUnionElements | ContentTypeSnippetsWithUnionElements,
  taxonomies: ReadonlyArray<TaxonomyContracts.ITaxonomyContract>,
  logOptions: LogOptions,
): ElementWithOldContentGroup<SyncTaxonomyElement> => {
  const taxonomyGroup = taxonomies.find(t => t.id === element.taxonomy_group.id);
  if (!taxonomyGroup) {
    logWarning(
      logOptions,
      "standard",
      `could not find taxonomyGroup with id ${element.taxonomy_group.id} in element with codename ${element.codename}`,
    );
  }

  const taxonomyGroupReference = taxonomyGroup ? { codename: taxonomyGroup.codename } : undefined;

  const findTerm = (
    term: TaxonomyContracts.ITaxonomyContract,
    id: string,
  ): TaxonomyContracts.ITaxonomyContract | null =>
    term.id === id ? term : term.terms
      .reduce<TaxonomyContracts.ITaxonomyContract | null>((res, term) => res || findTerm(term, id), null);

  const defaultTermsReferences = taxonomyGroup
    ? element.default?.global.value.map(t => {
      const term = findTerm(taxonomyGroup, t.id as string);

      if (!term) {
        logWarning(
          logOptions,
          "standard",
          `Could not find term with id ${t.id} in element with codename ${element.codename}`,
        );
        return null;
      }

      return { codename: term.codename };
    }).filter(notNullOrUndefined)
    : undefined;
  const defaultTerms = defaultTermsReferences ? { global: { value: defaultTermsReferences } } : undefined;

  return {
    ...omit(element, ["id"]),
    taxonomy_group: taxonomyGroupReference ?? { external_id: element.taxonomy_group.id as string },
    name: element.name as string,
    default: defaultTerms,
    codename: element.codename as string,
    external_id: element.external_id ?? makeNestedExternalId(type.codename, element.codename as string),
  };
};

export const transformLinkedItemsElement = (
  element: ContentTypeElements.ILinkedItemsElement,
  type: ContentTypeWithUnionElements | ContentTypeSnippetsWithUnionElements,
  contentTypes: ReadonlyArray<ContentTypeWithUnionElements>,
  items: ReadonlyArray<ContentItemContracts.IContentItemModelContract>,
  logOptions: LogOptions,
): ElementWithOldContentGroup<SyncLinkedItemsElement> => {
  const allowedContentTypes = element.allowed_content_types?.map(type =>
    handleContentType(
      type,
      contentTypes,
      `could not find type with id ${type.id} to be used in allowed_content_types in element with codename ${element.codename}. Skipping it`,
      logOptions,
    )
  ).filter(notNullOrUndefined);

  const defaultValues = element.default?.global.value.map(itemReference => {
    const item = items.find(i => i.id === itemReference.id);

    if (!item) {
      logWarning(logOptions, "standard", `could not find item with id ${itemReference.id}. Skipping it`);
      return null;
    }

    return {
      codename: item.codename,
      external_id: item.external_id ?? item.id,
    };
  }).filter(notNullOrUndefined);

  const defaultReference = defaultValues?.length ? { global: { value: defaultValues } } : undefined;

  return {
    ...omit(element, ["id"]),
    allowed_content_types: allowedContentTypes?.length ? allowedContentTypes : undefined,
    default: defaultReference,
    codename: element.codename as string,
    external_id: element.external_id ?? makeNestedExternalId(type.codename, element.codename as string),
  };
};

export const transformGuidelinesElement = (
  element: ContentTypeElements.IGuidelinesElement,
  type: ContentTypeWithUnionElements | ContentTypeSnippetsWithUnionElements,
  assets: ReadonlyArray<AssetContracts.IAssetModelContract>,
  items: ReadonlyArray<ContentItemContracts.IContentItemModelContract>,
  logOptions: LogOptions,
): ElementWithOldContentGroup<SyncGuidelinesElement> => ({
  ...omit(element, ["id"]),
  guidelines: replaceRichTextReferences(element.guidelines, assets, items, logOptions),
  codename: element.codename as string,
  external_id: element.external_id ?? makeNestedExternalId(type.codename, element.codename as string),
});

export const transformDefaultElement = (
  element: ContentTypeElements.ITextElement | ContentTypeElements.INumberElement | ContentTypeElements.IDateTimeElement,
  type: ContentTypeWithUnionElements | ContentTypeSnippetsWithUnionElements,
) => ({
  ...omit(element, ["id"]),
  codename: element.codename as string,
  external_id: element.external_id ?? makeNestedExternalId(type.codename, element.codename as string),
});

export const transformUrlSlugElement = (
  element: ContentTypeElements.IUrlSlugElement,
  type: ContentTypeWithUnionElements,
  snippets: ReadonlyArray<ContentTypeSnippetsWithUnionElements>,
): ElementWithOldContentGroup<SyncUrlSlugElement> => {
  const snippet = snippets.find(s => s.id === element.depends_on.snippet?.id);

  if (element.depends_on.snippet && !snippet) {
    throwError(
      `Could not find snippet (id: ${element.depends_on.snippet}) which contains element (id: ${element.depends_on.element})`,
    );
  }

  const depends_on = {
    element: {
      codename: element.depends_on.snippet
        ? snippet?.elements.find(el => el.id === element.depends_on.element.id)?.codename
          ?? throwError(
            `Could not find element in type with codename ${type.codename} with element id ${element.depends_on.element.id}`,
          )
        : type.elements.find(el => el.id === element.depends_on.element.id)?.codename
          ?? throwError(
            `Could not find element in type with codename ${type.codename} with element id ${element.depends_on.element.id}`,
          ),
    },
    snippet: snippet
      ? {
        codename: snippet.codename,
      }
      : undefined,
  };

  return {
    ...omit(element, ["id"]),
    depends_on,
    codename: element.codename as string,
    external_id: element.external_id ?? makeNestedExternalId(type.codename, element.codename as string),
  };
};

export const transformSnippetElement = (
  element: ContentTypeElements.ISnippetElement,
  type: ContentTypeWithUnionElements | ContentTypeSnippetsWithUnionElements,
  snippets: ReadonlyArray<ContentTypeSnippetsWithUnionElements>,
): ElementWithOldContentGroup<SyncTypeSnippetElement> => {
  const snippet = snippets.find(s => s.id === element.snippet.id)
    ?? throwError(`snippet with id ${element.snippet.id} not found`);

  return {
    ...omit(element, ["id"]),
    snippet: { codename: snippet.codename },
    codename: element.codename as string,
    external_id: element.external_id ?? makeNestedExternalId(type.codename, element.codename as string),
  };
};

export const transformSubpagesElement = (
  element: ContentTypeElements.ISubpagesElement,
  type: ContentTypeWithUnionElements | ContentTypeSnippetsWithUnionElements,
  contentTypes: ReadonlyArray<ContentTypeWithUnionElements>,
  items: ReadonlyArray<ContentItemContracts.IContentItemModelContract>,
  logOptions: LogOptions,
): ElementWithOldContentGroup<SyncSubpagesElement> => ({
  ...transformLinkedItemsElement({ ...element, type: "modular_content" }, type, contentTypes, items, logOptions),
  type: "subpages",
});
