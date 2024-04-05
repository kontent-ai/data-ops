import { LogOptions } from "../../../log.js";
import { extractNulls, omit } from "../../../utils/object.js";
import { EnvironmentModel } from "../generateSyncModel.js";
import { ContentTypeSnippetsWithUnionElements, SnippetElement } from "../types/contractModels.js";
import { ContentTypeSnippetsSyncModel } from "../types/fileContentModel.js";
import { SyncSnippetElement } from "../types/syncModel.js";
import {
  transformAssetElement,
  transformCustomElement,
  transformDefaultElement,
  transformGuidelinesElement,
  transformLinkedItemsElement,
  transformMultipleChoiceElement,
  transformRichTextElement,
  transformTaxonomyElement,
} from "./elementTransformers.js";

export const transformContentTypeSnippetsModel = (
  environmentModel: EnvironmentModel,
  logOptions: LogOptions,
) =>
  environmentModel.contentTypeSnippets.map(snippet => {
    const syncSnippetElements = snippet.elements
      .map<SyncSnippetElement>(element =>
        omit(transformElement(element, snippet, environmentModel, logOptions), ["content_group"])
      );

    const transformedSnippet = {
      ...omit(snippet, ["id", "last_modified"]),
      elements: syncSnippetElements,
      external_id: snippet.external_id ?? snippet.id,
    };

    return extractNulls(transformedSnippet) as ContentTypeSnippetsSyncModel;
  });

const transformElement = (
  element: SnippetElement,
  snippet: ContentTypeSnippetsWithUnionElements,
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
      return transformCustomElement(element, snippet);
    case "asset":
      return transformAssetElement(element, environmentModel.assets, logOptions);
    case "rich_text":
      return transformRichTextElement(element, environmentModel.contentTypes, logOptions);
    default:
      return transformDefaultElement(element);
  }
};
