import { omit } from "../../../utils/object.js";
import { EnvironmentModel } from "../generateSyncModel.js";
import { ContentTypeSnippetsSyncModel } from "../types/fileContentModel.js";

export const transformContentTypeSnippetsModel = (
  environmentModel: EnvironmentModel
) => {
  environmentModel.contentTypeSnippets.map(snippet => {
    const syncSnippetElements: ContentTypeSnippetsSyncModel["elements"] = snippet.elements
      .map(element => {
        switch (element.type) {
          case "guidelines":
            return { ...element, codename: element.codename as string };
          case "modular_content":
            return { ...element, codename: element.codename as string };
          case "taxonomy":
            return { ...element, codename: element.codename as string };
          case "multiple_choice":
            return { ...element, codename: element.codename as string };
          case "custom":
            return { ...element, codename: element.codename as string };
          case "asset":
            return { ...element, codename: element.codename as string };
          case "rich_text":
            return { ...element, codename: element.codename as string };
          default:
            return { ...omit(element, ["id"]), codename: element.codename as string };
        }
      });

    return { ...omit(snippet, ["id", "last_modified"]), elements: syncSnippetElements };
  });

  return [] as ContentTypeSnippetsSyncModel[];
};
