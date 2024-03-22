import { ContentTypeElements, ElementContracts } from "@kontent-ai/management-sdk";

import { omit } from "../../../utils/object.js";
import { Replace } from "../../../utils/types.js";
import { EnvironmentModel } from "../generateSyncModel.js";
import { ContentTypeSnippetsSyncModel } from "../types/fileContentModel.js";
import {
  transformAssetElement,
  transformCustomElement,
  transformDefaultElement,
  transformGuidelinesElement,
  transformLinkedItemsElement,
  transformMultipleChoiceElement,
  transformRichText,
  transformTaxonomyElement,
} from "./elementTransformers.js";

export const transformContentTypeSnippetsModel = (
  environmentModel: EnvironmentModel,
) =>
  environmentModel.contentTypeSnippets.map(snippet => {
    const syncSnippetElements: ContentTypeSnippetsSyncModel["elements"] = snippet.elements
      .map(element => {
        switch (element.type) {
          case "guidelines":
            return transformGuidelinesElement(
              element as unknown as ContentTypeElements.IGuidelinesElement,
              environmentModel.assets,
              environmentModel.items,
            ) as unknown as Replace<ElementContracts.IContentTypeElementContract, "codename", string>;
          case "modular_content":
            return transformLinkedItemsElement(
              element as ContentTypeElements.ILinkedItemsElement,
              environmentModel.contentTypes,
              environmentModel.items,
            );
          case "taxonomy":
            return transformTaxonomyElement(
              element as ContentTypeElements.ITaxonomyElement,
              environmentModel.taxonomyGroups,
            );
          case "multiple_choice":
            return transformMultipleChoiceElement(element as ContentTypeElements.IMultipleChoiceElement);
          case "custom":
            return transformCustomElement(element as ContentTypeElements.ICustomElement, snippet);
          case "asset":
            return transformAssetElement(element as ContentTypeElements.IAssetElement, environmentModel.assets);
          case "rich_text":
            return transformRichText(element as ContentTypeElements.IRichTextElement, environmentModel.contentTypes);
          default:
            return transformDefaultElement(element);
        }
      });

    return {
      ...omit(snippet, ["id", "last_modified"]),
      elements: syncSnippetElements,
      external_id: snippet.external_id ?? snippet.id,
    };
  });
