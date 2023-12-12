import {
  ContentTypeElements,
  ContentTypeElementsBuilder,
  ContentTypeSnippetElements,
  ContentTypeSnippetModels,
  ElementContracts,
} from "@kontent-ai/management-sdk";

import { notNullOrUndefined } from "../../../../utils/typeguards.js";
import { ImportContext } from "../../entityDefinition.js";
import { replaceRichTextReferences } from "./richText.js";

export type TransformTypeElementParams = Readonly<{
  context: ImportContext;
  builder: ContentTypeSnippetElements | ContentTypeElementsBuilder;
  typeOrSnippetCodename: string;
  contentGroupExternalIdByOldId: ReadonlyMap<string, string>;
  elementExternalIdsByOldId: ReadonlyMap<string, string>;
}>;

export const createTransformTypeElement =
  (params: TransformTypeElementParams) =>
  (element: ElementContracts.IContentTypeElementContract): ContentTypeElements.IElementShared => {
    const fallbackExternalId = params.elementExternalIdsByOldId.get(element.id ?? "");
    const elementWithGroup = element as ContentTypeElements.IElementShared;
    const content_group = elementWithGroup.content_group
      ? { external_id: params.contentGroupExternalIdByOldId.get(elementWithGroup.content_group.id ?? "") }
      : undefined;

    switch (element.type) {
      case "asset": {
        const typedElement = element as ContentTypeElements.IAssetElement;
        return params.builder.assetElement({
          ...typedElement,
          type: "asset",
          external_id: typedElement.external_id ?? fallbackExternalId,
          content_group,
          default: typedElement.default
            ? {
              global: {
                value: typedElement.default.global.value.map(ref => ({
                  id: params.context.assetIdsByOldIds.get(ref.id ?? ""),
                })),
              },
            }
            : undefined,
        });
      }
      case "custom": {
        const typedElement = element as ContentTypeElements.ICustomElement;
        return params.builder.customElement({
          ...typedElement,
          type: "custom",
          external_id: typedElement.external_id ?? fallbackExternalId,
          content_group,
          allowed_elements: typedElement.allowed_elements?.map(ref => ({
            external_id: params.elementExternalIdsByOldId.get(ref.id ?? ""),
          })),
        });
      }
      case "date_time": {
        const typedElement = element as ContentTypeElements.IDateTimeElement;
        return params.builder.dateTimeElement({
          ...typedElement,
          type: "date_time",
          content_group,
          external_id: typedElement.external_id ?? fallbackExternalId,
        });
      }
      case "guidelines": {
        const typedElement = element as unknown as ContentTypeElements.IGuidelinesElement;
        return params.builder.guidelinesElement({
          ...typedElement,
          type: "guidelines",
          external_id: typedElement.external_id ?? fallbackExternalId,
          content_group,
        });
      }
      case "modular_content": {
        const typedElement = element as ContentTypeElements.ILinkedItemsElement;
        return params.builder.linkedItemsElement({
          ...typedElement,
          type: "modular_content",
          external_id: typedElement.external_id ?? fallbackExternalId,
          content_group,
          allowed_content_types: undefined, // will be set later (when types are imported) to be able to map the ids
          default: undefined, // will be set later (when items are imported) to be able to map the ids
        });
      }
      case "multiple_choice": {
        const typedElement = element as ContentTypeElements.IMultipleChoiceElement;
        return params.builder.multipleChoiceElement({
          ...typedElement,
          type: "multiple_choice",
          external_id: typedElement.external_id ?? fallbackExternalId,
          content_group,
          options: typedElement.options.map(o => ({ ...o, external_id: o.external_id ?? o.codename })),
          default: typedElement.default
            ? {
              global: {
                value: typedElement.default.global.value.map(ref => {
                  const oldOption = typedElement.options.find(o => o.id === ref.id);
                  if (!oldOption) {
                    throw new Error(
                      `Default value of a multiple_choice element (codename: "${typedElement.codename}")contains a non-existent option.`,
                    );
                  }

                  return { external_id: oldOption.external_id ?? oldOption.codename };
                }),
              },
            }
            : undefined,
        });
      }
      case "number": {
        const typedElement = element as ContentTypeElements.INumberElement;
        return params.builder.numberElement({
          ...typedElement,
          type: "number",
          external_id: typedElement.external_id ?? fallbackExternalId,
          content_group,
        });
      }
      case "rich_text": {
        const typedElement = element as ContentTypeElements.IRichTextElement;
        return params.builder.richTextElement({
          ...typedElement,
          type: "rich_text",
          external_id: typedElement.external_id ?? fallbackExternalId,
          content_group,
          allowed_content_types: undefined, // will be set later (when types are imported) to be able to map the ids
          allowed_item_link_types: undefined, // will be set later (when types are imported) to be able to map the ids
        });
      }
      case "snippet": {
        // check if the provided builder is for a type not a snippet
        if (!("snippetElement" in params.builder)) {
          throw new Error(
            `Type snippet with codename "${params.typeOrSnippetCodename}" has an element (codename: "${element.codename}") of type snippet which is not allowed.`,
          );
        }

        const typedElement = element as unknown as ContentTypeElements.ISnippetElement;
        return params.builder.snippetElement({
          ...typedElement,
          type: "snippet",
          external_id: typedElement.external_id ?? fallbackExternalId,
          content_group,
          snippet: {
            id: params.context.contentTypeSnippetIdsWithElementsByOldIds.get(typedElement.snippet.id ?? "")?.selfId,
          },
        });
      }
      case "subpages": {
        const typedElement = element as ContentTypeElements.ISubpagesElement;
        return params.builder.subpagesElement({
          ...typedElement,
          type: "subpages",
          external_id: typedElement.external_id ?? fallbackExternalId,
          content_group,
          allowed_content_types: undefined, // will be set later (when types are imported) to be able to map the ids
          default: undefined, // will be set later (when items are imported) to be able to map the ids
        } as ContentTypeElements.ISubpagesElementData);
      }
      case "taxonomy": {
        const typedElement = element as ContentTypeElements.ITaxonomyElement;
        return params.builder.taxonomyElement({
          ...typedElement,
          type: "taxonomy",
          external_id: typedElement.external_id ?? fallbackExternalId,
          content_group,
          taxonomy_group: { id: params.context.taxonomyGroupIdsByOldIds.get(typedElement.taxonomy_group.id ?? "") },
          default: typedElement.default
            ? {
              global: {
                value: typedElement.default.global.value.map(ref => ({
                  id: params.context.taxonomyTermIdsByOldIds.get(ref.id ?? ""),
                })),
              },
            }
            : undefined,
        });
      }
      case "text": {
        const typedElement = element as ContentTypeElements.ITextElement;
        return params.builder.textElement({
          ...typedElement,
          type: "text",
          external_id: typedElement.external_id ?? fallbackExternalId,
          content_group,
        });
      }
      case "url_slug": {
        // check if the provided builder is for a type not a snippet
        if (!("urlSlugElement" in params.builder)) {
          throw new Error(
            `Type snippet with codename "${params.typeOrSnippetCodename}" has en element (codename: "${element.codename}") of type url_slug which is not allowed.`,
          );
        }
        const typedElement = element as ContentTypeElements.IUrlSlugElement;

        return params.builder.urlSlugElement({
          ...typedElement,
          type: "url_slug",
          external_id: typedElement.external_id ?? fallbackExternalId,
          content_group,
          depends_on: {
            element: typedElement.depends_on.snippet
              ? {
                id:
                  params.context.contentTypeSnippetIdsWithElementsByOldIds.get(typedElement.depends_on.snippet.id ?? "")
                    ?.elementIdsByOldIds.get(typedElement.depends_on.element.id ?? "") ?? "",
              }
              : { external_id: params.elementExternalIdsByOldId.get(typedElement.depends_on.element.id ?? "") },
            snippet: typedElement.depends_on.snippet?.id
              ? {
                id: params.context.contentTypeSnippetIdsWithElementsByOldIds.get(typedElement.depends_on.snippet.id)
                  ?.selfId,
              }
              : undefined,
          },
        });
      }
      default: {
        throw new Error(`Found a type element that is of unknown type "${element.type}".`);
      }
    }
  };

export const createPatchItemAndTypeReferencesInTypeElement =
  (context: ImportContext, pickElementsByOldIds: (context: ImportContext) => ReadonlyMap<string, string> | undefined) =>
  (
    fileElement: ElementContracts.IContentTypeElementContract,
  ): ReadonlyArray<ContentTypeSnippetModels.IModifyContentTypeSnippetData> => {
    const newElementId = pickElementsByOldIds(context)?.get(fileElement.id ?? "");
    if (!newElementId) {
      throw new Error(
        `Failed to find new element id for element (codename: "${fileElement.codename}", id: "${fileElement.id}").`,
      );
    }

    switch (fileElement.type) {
      case "asset":
      case "custom":
      case "date_time":
      case "multiple_choice":
      case "number":
      case "snippet":
      case "taxonomy":
      case "text":
      case "url_slug":
        return [];

      case "guidelines": {
        const typedElement = fileElement as unknown as ContentTypeElements.IGuidelinesElement;
        const newGuidelines = replaceRichTextReferences(typedElement.guidelines, context);

        return newGuidelines === typedElement.guidelines ? [] : [
          {
            op: "replace",
            path: `/elements/id:${newElementId}/guidelines`,
            value: newGuidelines,
          },
        ];
      }
      case "modular_content": {
        const typedElement = fileElement as ContentTypeElements.ILinkedItemsElement;

        return [
          typedElement.allowed_content_types && {
            op: "replace" as const,
            path: `/elements/id:${newElementId}/allowed_content_types`,
            value: typedElement.allowed_content_types.map(ref => ({
              id: context.contentTypeIdsWithElementsByOldIds.get(ref.id ?? "")?.selfId,
            })),
          },
          typedElement.default && {
            op: "replace" as const,
            path: `/elements/id:${newElementId}/default`,
            value: {
              global: {
                value: typedElement.default.global.value.map(ref => ({
                  id: context.contentItemIdsByOldIds.get(ref.id ?? ""),
                })),
              },
            },
          },
        ].filter(notNullOrUndefined);
      }
      case "rich_text": {
        const typedElement = fileElement as ContentTypeElements.IRichTextElement;

        return [
          typedElement.allowed_content_types && {
            op: "replace" as const,
            path: `/elements/id:${newElementId}/allowed_content_types`,
            value: typedElement.allowed_content_types.map(ref => ({
              id: context.contentTypeIdsWithElementsByOldIds.get(ref.id ?? "")?.selfId,
            })),
          },
          typedElement.allowed_item_link_types && {
            op: "replace" as const,
            path: `/elements/id:${newElementId}/allowed_item_link_types`,
            value: typedElement.allowed_item_link_types.map(ref => ({
              id: context.contentTypeIdsWithElementsByOldIds.get(ref.id ?? "")?.selfId,
            })),
          },
        ].filter(notNullOrUndefined);
      }
      case "subpages": {
        const typedElement = fileElement as ContentTypeElements.ISubpagesElement & {
          readonly default: ContentTypeElements.ILinkedItemsElement["default"];
        }; // Bad types from the SDK, remove once fixed

        return [
          typedElement.allowed_content_types && {
            op: "replace" as const,
            path: `/elements/id:${newElementId}/allowed_content_types`,
            value: typedElement.allowed_content_types.map(ref => ({
              id: context.contentTypeIdsWithElementsByOldIds.get(ref.id ?? "")?.selfId,
            })),
          },
          typedElement.default && {
            op: "replace" as const,
            path: `/elements/id:${newElementId}/default`,
            value: {
              global: {
                value: typedElement.default.global.value.map(ref => ({
                  id: context.contentItemIdsByOldIds.get(ref.id ?? ""),
                })),
              },
            },
          },
        ].filter(notNullOrUndefined);
      }
      default: {
        throw new Error(`Found a type element that is of unknown type "${fileElement.type}".`);
      }
    }
  };
