import {
  ContentTypeElements,
  ContentTypeElementsBuilder,
  ContentTypeSnippetElements,
  ContentTypeSnippetModels,
  ElementContracts,
} from "@kontent-ai/management-sdk";

import { notNullOrUndefined } from "../../../../utils/typeguards.js";
import { FixReferences, Replace, RequiredId } from "../../../../utils/types.js";
import { getRequired } from "../../../import/utils.js";
import { ImportContext } from "../../entityDefinition.js";
import { createReference } from "./referece.js";
import { replaceImportRichTextReferences } from "./richText.js";

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
    const fallbackExternalId = getRequired(params.elementExternalIdsByOldId, element.id ?? "", "element");
    const elementWithGroup = element as ContentTypeElements.IElementShared;
    const content_group = elementWithGroup.content_group
      ? {
        external_id: getRequired(
          params.contentGroupExternalIdByOldId,
          elementWithGroup.content_group.id ?? "",
          "content group",
        ),
      }
      : undefined;

    switch (element.type) {
      case "asset": {
        const typedElement = element as FixReferences<ContentTypeElements.IAssetElement>;
        return params.builder.assetElement({
          ...typedElement,
          type: "asset",
          external_id: typedElement.external_id ?? fallbackExternalId,
          content_group,
          default: typedElement.default
            ? {
              global: {
                value: typedElement.default.global.value.map(ref =>
                  createReference({
                    newId: params.context.assetIdsByOldIds.get(ref.id),
                    oldId: ref.id,
                    entityName: "asset",
                  })
                ),
              },
            }
            : undefined,
        });
      }
      case "custom": {
        const typedElement = element as FixReferences<ContentTypeElements.ICustomElement>;
        return params.builder.customElement({
          ...typedElement,
          type: "custom",
          external_id: typedElement.external_id ?? fallbackExternalId,
          content_group,
          allowed_elements: typedElement.allowed_elements
            ?.map(ref => ({ external_id: params.elementExternalIdsByOldId.get(ref.id) ?? "non-existent-element" })),
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

        const makeOptionFallbackExternalId = (o: ContentTypeElements.IMultipleChoiceOption) =>
          `${params.typeOrSnippetCodename}_${typedElement.codename}_${o.codename}`;

        return params.builder.multipleChoiceElement({
          ...typedElement,
          type: "multiple_choice",
          external_id: typedElement.external_id ?? fallbackExternalId,
          content_group,
          options: typedElement.options.map(o => ({
            ...o,
            external_id: o.external_id ?? makeOptionFallbackExternalId(o),
          })),
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

                  return { external_id: oldOption.external_id ?? makeOptionFallbackExternalId(oldOption) };
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

        const typedElement = element as unknown as FixReferences<ContentTypeElements.ISnippetElement>;
        return params.builder.snippetElement({
          ...typedElement,
          type: "snippet",
          external_id: typedElement.external_id ?? fallbackExternalId,
          content_group,
          snippet: {
            id:
              getRequired(params.context.contentTypeSnippetContextByOldIds, typedElement.snippet.id, "snippet").selfId,
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
        } as ContentTypeElements.ISubpagesElementData); // ISubpagesElementData doesn't include the property 'default' that's a mistake in the SDK type
      }
      case "taxonomy": {
        const typedElement = element as FixReferences<ContentTypeElements.ITaxonomyElement>;
        const newGroupId = params.context.taxonomyGroupIdsByOldIds.get(typedElement.taxonomy_group.id);

        if (!newGroupId) {
          throw new Error(
            `The type element "${typedElement.id}" of type or snippet "${params.typeOrSnippetCodename}" has reference to a non-existent taxonomy group so it can't be created.`,
          );
        }

        return params.builder.taxonomyElement({
          ...typedElement,
          type: "taxonomy",
          external_id: typedElement.external_id ?? fallbackExternalId,
          content_group,
          taxonomy_group: { id: newGroupId },
          default: typedElement.default
            ? {
              global: {
                value: typedElement.default.global.value.map(ref =>
                  createReference({
                    newId: params.context.taxonomyTermIdsByOldIds.get(ref.id),
                    oldId: ref.id,
                    entityName: "term",
                  })
                ),
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
        const typedElement = element as FixReferences<ContentTypeElements.IUrlSlugElement>;

        return params.builder.urlSlugElement({
          ...typedElement,
          type: "url_slug",
          external_id: typedElement.external_id ?? fallbackExternalId,
          content_group,
          depends_on: {
            element: typedElement.depends_on.snippet
              ? {
                id: getRequired(
                  getRequired(
                    params.context.contentTypeSnippetContextByOldIds,
                    typedElement.depends_on.snippet.id ?? "",
                    "snippet",
                  ).elementIdsByOldIds,
                  typedElement.depends_on.element.id,
                  "element",
                ),
              }
              : {
                external_id: getRequired(
                  params.elementExternalIdsByOldId,
                  typedElement.depends_on.element.id,
                  "element",
                ),
              },
            snippet: typedElement.depends_on.snippet?.id
              ? {
                id: getRequired(
                  params.context.contentTypeSnippetContextByOldIds,
                  typedElement.depends_on.snippet.id,
                  "snippet",
                ).selfId,
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
  (context: ImportContext, elementsByOldIds: ReadonlyMap<string, string>) =>
  (
    fileElement: RequiredId<ElementContracts.IContentTypeElementContract>,
  ): ReadonlyArray<ContentTypeSnippetModels.IModifyContentTypeSnippetData> => {
    const newElementId = getRequired(elementsByOldIds, fileElement.id, "element");

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
        const newGuidelines = replaceImportRichTextReferences(typedElement.guidelines, context, new Set());

        return newGuidelines === typedElement.guidelines ? [] : [
          {
            op: "replace",
            path: `/elements/id:${newElementId}/guidelines`,
            value: newGuidelines,
          },
        ];
      }
      case "modular_content": {
        const typedElement = fileElement as FixReferences<ContentTypeElements.ILinkedItemsElement>;

        return [
          typedElement.allowed_content_types && {
            op: "replace" as const,
            path: `/elements/id:${newElementId}/allowed_content_types`,
            value: typedElement.allowed_content_types
              .map(ref =>
                createReference({
                  newId: context.contentTypeContextByOldIds.get(ref.id)?.selfId,
                  oldId: ref.id,
                  entityName: "type",
                })
              ),
          },
          typedElement.default && {
            op: "replace" as const,
            path: `/elements/id:${newElementId}/default`,
            value: {
              global: {
                value: typedElement.default.global.value
                  .map(ref =>
                    createReference({
                      newId: context.contentItemContextByOldIds.get(ref.id)?.selfId,
                      oldId: ref.id,
                      entityName: "item",
                    })
                  ),
              },
            },
          },
        ].filter(notNullOrUndefined);
      }
      case "rich_text": {
        const typedElement = fileElement as FixReferences<ContentTypeElements.IRichTextElement>;

        return [
          typedElement.allowed_content_types && {
            op: "replace" as const,
            path: `/elements/id:${newElementId}/allowed_content_types`,
            value: typedElement.allowed_content_types
              .map(ref =>
                createReference({
                  newId: context.contentTypeContextByOldIds.get(ref.id)?.selfId,
                  oldId: ref.id,
                  entityName: "type",
                })
              ),
          },
          typedElement.allowed_item_link_types && {
            op: "replace" as const,
            path: `/elements/id:${newElementId}/allowed_item_link_types`,
            value: typedElement.allowed_item_link_types
              .map(ref =>
                createReference({
                  newId: context.contentTypeContextByOldIds.get(ref.id)?.selfId,
                  oldId: ref.id,
                  entityName: "type",
                })
              ),
          },
        ].filter(notNullOrUndefined);
      }
      case "subpages": {
        const typedElement = fileElement as FixReferences<ContentTypeElements.ISubpagesElement> & {
          readonly default: FixReferences<ContentTypeElements.ILinkedItemsElement["default"]>;
        }; // Bad types from the SDK, remove once fixed

        return [
          typedElement.allowed_content_types && {
            op: "replace" as const,
            path: `/elements/id:${newElementId}/allowed_content_types`,
            value: typedElement.allowed_content_types
              .map(ref =>
                createReference({
                  newId: context.contentTypeContextByOldIds.get(ref.id)?.selfId,
                  oldId: ref.id,
                  entityName: "type",
                })
              ),
          },
          typedElement.default && {
            op: "replace" as const,
            path: `/elements/id:${newElementId}/default`,
            value: {
              global: {
                value: typedElement.default.global.value
                  .map(ref =>
                    createReference({
                      newId: context.contentItemContextByOldIds.get(ref.id)?.selfId,
                      oldId: ref.id,
                      entityName: "item",
                    })
                  ),
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

type Option = RequiredId<ContentTypeElements.IMultipleChoiceOption>;
export type MultiChoiceElement = Replace<
  ContentTypeElements.IMultipleChoiceElement,
  "options",
  ReadonlyArray<Option>
>;
