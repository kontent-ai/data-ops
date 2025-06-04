import type {
  ContentTypeElements,
  ContentTypeModels,
  ContentTypeSnippetModels,
  TaxonomyModels,
} from "@kontent-ai/management-sdk";

import type { RequiredCodename } from "../../../utils/types.js";
import type {
  ContentTypeSnippetsSyncModel,
  ContentTypeSyncModel,
  SyncGuidelinesElement,
  TaxonomySyncModel,
} from "../types/syncModel.js";
import { replaceAssetReferences, replaceItemReferences } from "./guidelinesRichText.js";

export const transformTaxonomyToAddModel = (
  taxonomy: TaxonomySyncModel,
): RequiredCodename<TaxonomyModels.IAddTaxonomyRequestModel> => ({
  ...taxonomy,
  terms: taxonomy.terms.map(transformTaxonomyToAddModel),
});

export const transformTypeToAddModel =
  (params: TransformElementParams) =>
  (type: ContentTypeSyncModel): RequiredCodename<ContentTypeModels.IAddContentTypeData> => ({
    ...type,
    content_groups: type.content_groups as MakeArrayMutable<typeof type.content_groups>,
    elements: type.elements.map(
      transformElementToAddModel(params),
    ) as ContentTypeElements.Element[],
  });

export const transformSnippetToAddModel =
  (params: TransformElementParams) =>
  (
    snippet: ContentTypeSnippetsSyncModel,
  ): RequiredCodename<ContentTypeSnippetModels.IAddContentTypeSnippetData> => ({
    ...snippet,
    elements: snippet.elements.map(
      transformElementToAddModel(params),
    ) as ContentTypeElements.Element[],
  });

type TransformElementParams = Readonly<{
  targetItemsReferencedFromSourceByCodenames: ReadonlyMap<
    string,
    Readonly<{ id: string; codename: string }>
  >;
  targetAssetsReferencedFromSourceByCodenames: ReadonlyMap<
    string,
    Readonly<{ id: string; codename: string }>
  >;
}>;

const transformElementToAddModel =
  (params: TransformElementParams) =>
  (
    el: ContentTypeSyncModel["elements"][number],
  ):
    | ContentTypeElements.Element
    | { type: "subpages"; default?: ContentTypeElements.ILinkedItemsElement["default"] } => {
    // to fix SDK types bug
    switch (el.type) {
      case "number":
      case "snippet":
      case "url_slug":
      case "date_time":
      case "text":
        return el;
      case "asset":
        return {
          ...el,
          // the casting is needed to fix match the SDK mutable arrays, we can remove it once we change the SDK types
          default: el.default
            ? {
                global: {
                  value: el.default.global.value.map((a) =>
                    params.targetAssetsReferencedFromSourceByCodenames.has(a.codename)
                      ? { codename: a.codename }
                      : { external_id: a.external_id },
                  ),
                },
              }
            : undefined,
        };
      case "custom":
        return el as MakeArraysMutable<typeof el>;
      case "subpages":
      case "modular_content":
        return {
          ...el,
          default: el.default
            ? {
                global: {
                  value: el.default.global.value.map((a) =>
                    params.targetAssetsReferencedFromSourceByCodenames.has(a.codename)
                      ? { codename: a.codename }
                      : { external_id: a.external_id },
                  ),
                },
              }
            : undefined,
          allowed_content_types: el.allowed_content_types as MakeArrayMutable<
            typeof el.allowed_content_types
          >,
        };
      case "taxonomy":
        return {
          ...el,
          default: el.default
            ? { global: el.default.global as MakeArraysMutable<typeof el.default.global> }
            : undefined,
        };
      case "rich_text":
        return el as MakeArraysMutable<typeof el>;
      case "multiple_choice":
        return {
          ...el,
          options: el.options as MakeArrayMutable<typeof el.options>,
          default: el.default
            ? { global: el.default.global as MakeArraysMutable<typeof el.default.global> }
            : undefined,
        };
      case "guidelines":
        return transformGuidelinesElementToAddModel(params, el);
    }
  };

export const transformGuidelinesElementToAddModel = (
  params: TransformElementParams,
  element: SyncGuidelinesElement,
): ContentTypeElements.IGuidelinesElement => {
  const guidelinesWithTransformedAssetReferences = replaceAssetReferences(
    element.guidelines,
    (ref) => {
      const targetAsset = params.targetAssetsReferencedFromSourceByCodenames.get(
        ref.codename ?? "",
      );

      return targetAsset ? { internalId: targetAsset.id } : { externalId: ref.externalId ?? "" };
    },
  );
  return {
    ...element,
    guidelines: replaceItemReferences(guidelinesWithTransformedAssetReferences, (ref) => {
      const targetItem = params.targetItemsReferencedFromSourceByCodenames.get(ref.codename ?? "");

      return targetItem ? { internalId: targetItem.id } : { externalId: ref.externalId ?? "" };
    }),
  };
};

type MakeArraysMutable<T extends object> = {
  [Key in keyof T]: T[Key] extends ReadonlyArray<unknown> | undefined
    ? MakeArrayMutable<T[Key]>
    : T[Key];
};

type MakeArrayMutable<T extends ReadonlyArray<unknown> | undefined> = T extends ReadonlyArray<
  infer Elem
>
  ? Elem[]
  : T;
