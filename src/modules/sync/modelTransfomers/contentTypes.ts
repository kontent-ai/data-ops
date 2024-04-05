import { ContentTypeElements } from "@kontent-ai/management-sdk";

import { LogOptions } from "../../../log.js";
import { extractNulls, omit } from "../../../utils/object.js";
import { EnvironmentModel } from "../generateSyncModel.js";
import { ContentTypeWithUnionElements } from "../types/contractModels.js";
import { ContentTypeSyncModel } from "../types/fileContentModel.js";
import { SyncTypeElement } from "../types/syncModel.js";
import {
  transformAssetElement,
  transformCustomElement,
  transformDefaultElement,
  transformGuidelinesElement,
  transformLinkedItemsElement,
  transformMultipleChoiceElement,
  transformRichTextElement,
  transformSnippetElement,
  transformSubpagesElement,
  transformTaxonomyElement,
  transformUrlSlugElement,
} from "./elementTransformers.js";

export const transformContentTypeModel = (
  environmentModel: EnvironmentModel,
  logOptions: LogOptions,
) => {
  return environmentModel.contentTypes.map(type => {
    const transformedElements = type.elements.map<SyncTypeElement>(element => {
      const transformedElement = transformElement(element, type, environmentModel, logOptions);

      const contentGroup = type.content_groups?.find(group => group.id === element.content_group?.id);

      if (type.content_groups?.length && !contentGroup) {
        throw new Error(
          `Could not find group(id: ${element.content_group?.id}) in the content type (codename: ${type.codename})`,
        );
      }

      return ({
        ...transformedElement,
        content_group: contentGroup ? { codename: contentGroup.codename as string } : undefined,
      });
    });

    const transformedContentType = {
      ...omit(type, ["id", "last_modified"]),
      elements: transformedElements,
      content_groups: type.content_groups?.map(group => ({
        ...omit(group, ["id"]),
        external_id: group.external_id ?? group.id,
        codename: group.codename as string,
      })),
      external_id: type.external_id ?? type.id,
    };

    return extractNulls(transformedContentType) as ContentTypeSyncModel;
  });
};

const transformElement = (
  element: ContentTypeElements.Element,
  type: ContentTypeWithUnionElements,
  environmentModel: EnvironmentModel,
  logOptions: LogOptions,
) => {
  switch (element.type) {
    case "guidelines":
      return transformGuidelinesElement(
        element,
        environmentModel.assets,
        environmentModel.items,
        logOptions,
      );
    case "modular_content":
      return transformLinkedItemsElement(
        element,
        environmentModel.contentTypes,
        environmentModel.items,
        logOptions,
      );
    case "taxonomy":
      return transformTaxonomyElement(
        element,
        environmentModel.taxonomyGroups,
        logOptions,
      );
    case "multiple_choice":
      return transformMultipleChoiceElement(element);
    case "custom":
      return transformCustomElement(element, type);
    case "asset":
      return transformAssetElement(element, environmentModel.assets, logOptions);
    case "rich_text":
      return transformRichTextElement(element, environmentModel.contentTypes, logOptions);
    case "subpages":
      return transformSubpagesElement(element, environmentModel.contentTypes, environmentModel.items, logOptions);
    case "snippet":
      return transformSnippetElement(element, environmentModel.contentTypeSnippets);
    case "url_slug":
      return transformUrlSlugElement(element, type, environmentModel.contentTypeSnippets);
    default:
      return transformDefaultElement(element);
  }
};
