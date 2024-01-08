import { ContentTypeContracts, ContentTypeElements, ManagementClient } from "@kontent-ai/management-sdk";

import { zip } from "../../../utils/array.js";
import { serially } from "../../../utils/requests.js";
import { MapValues } from "../../../utils/types.js";
import { getRequired } from "../../import/utils.js";
import { EntityDefinition, EntityImportDefinition, ImportContext } from "../entityDefinition.js";
import { createPatchItemAndTypeReferencesInTypeElement, createTransformTypeElement } from "./utils/typeElements.js";

export const contentTypesEntity: EntityDefinition<ReadonlyArray<ContentTypeContracts.IContentTypeContract>> = {
  name: "contentTypes",
  fetchEntities: client =>
    client
      .listContentTypes()
      .toAllPromise()
      .then(res => res.data.items.map(t => t._raw)),
  serializeEntities: collections => JSON.stringify(collections),
  importEntities: async (client, fileTypes, context) => {
    const projectTypes = await serially(fileTypes.map(createInsertTypeFetcher({ context, client })));

    return {
      ...context,
      contentTypeContextByOldIds: new Map(zip(fileTypes, projectTypes).map(createMakeTypeContextByOldIdEntry(context))),
    };
  },
  deserializeEntities: JSON.parse,
};

export const updateItemAndTypeReferencesInTypesImportEntity: EntityImportDefinition<
  ReadonlyArray<ContentTypeContracts.IContentTypeContract>
> = {
  name: "contentTypes",
  deserializeEntities: JSON.parse,
  importEntities: async (client, fileTypes, context) => {
    await serially(fileTypes.map(createUpdateTypeItemReferencesFetcher({ client, context })));
  },
};

type InsertTypeParams = Readonly<{
  client: ManagementClient;
  context: ImportContext;
}>;

const createMakeTypeContextByOldIdEntry = (context: ImportContext) =>
(
  [fileType, projectType]: readonly [
    ContentTypeContracts.IContentTypeContract,
    ContentTypeContracts.IAddContentTypeResponseContract,
  ],
): readonly [string, MapValues<ImportContext["contentTypeContextByOldIds"]>] => {
  const elementIdEntries = zip(fileType.elements, projectType.elements)
    .flatMap(([fileEl, projectEl]) => {
      if (fileEl.type === "snippet") {
        const typedEl = fileEl as unknown as ContentTypeElements.ISnippetElement;
        return [
          ...getRequired(context.contentTypeSnippetContextByOldIds, typedEl.snippet.id ?? "", "snippet")
            .elementIdsByOldIds,
        ];
      }

      return [[fileEl.id ?? "", projectEl.id ?? ""] as const];
    });

  return [fileType.id, {
    selfId: projectType.id,
    elementIdsByOldIds: new Map(elementIdEntries),
    elementTypeByOldIds: new Map(
      fileType.elements
        .flatMap(el => {
          if (el.type === "snippet") {
            const typedEl = el as unknown as ContentTypeElements.ISnippetElement;
            return [
              ...getRequired(context.contentTypeSnippetContextByOldIds, typedEl.snippet.id ?? "", "snippet")
                .elementTypeByOldIds,
            ];
          }

          return [[el.id ?? "", el.type]];
        }),
    ),
    multiChoiceOptionIdsByOldIdsByOldElementId: new Map(
      fileType.elements
        .flatMap(el => {
          switch (el.type) {
            case "snippet": {
              const typedEl = el as unknown as ContentTypeElements.ISnippetElement;
              return [
                ...getRequired(context.contentTypeSnippetContextByOldIds, typedEl.snippet.id ?? "", "snippet")
                  .multiChoiceOptionIdsByOldIdsByOldElementId,
              ];
            }
            case "multiple_choice": {
              const typedEl = el as unknown as ContentTypeElements.IMultipleChoiceElement;
              const typedProjectEl = projectType.elements.find(e =>
                e.id === el.id
              ) as ContentTypeElements.IMultipleChoiceElement;

              return [[
                el.id ?? "",
                new Map(
                  zip(typedEl.options, typedProjectEl.options).map(([fO, pO]) => [fO.id ?? "", pO.id ?? ""]),
                ),
              ]];
            }
            default:
              return [];
          }
        }),
    ),
  }];
};

const createInsertTypeFetcher =
  (params: InsertTypeParams) => (type: ContentTypeContracts.IContentTypeContract) => async () =>
    params.client
      .addContentType()
      .withData(builder => ({
        name: type.name,
        codename: type.codename,
        external_id: type.external_id ?? type.codename,
        content_groups: type.content_groups?.map(g => ({ ...g, external_id: g.external_id ?? g.codename })),
        elements: type.elements.map(createTransformTypeElement({
          ...params,
          builder,
          typeOrSnippetCodename: type.codename,
          elementExternalIdsByOldId: new Map(
            type.elements.map(el => [el.id ?? "", el.external_id ?? `${type.codename}_${el.codename}`]),
          ),
          contentGroupExternalIdByOldId: new Map(
            type.content_groups?.map(g => [g.id ?? "", g.external_id ?? g.codename ?? ""] as const) ?? [],
          ),
        })),
      }))
      .toPromise()
      .then(res => res.rawData);

type UpdateTypeParams = Readonly<{
  client: ManagementClient;
  context: ImportContext;
}>;

const createUpdateTypeItemReferencesFetcher =
  (params: UpdateTypeParams) => (type: ContentTypeContracts.IContentTypeContract) => () => {
    const patchOps = type.elements
      .filter(el => el.type !== "snippet") // We don't need to update snippet elements and snippets are expanded (not present) in the elementIdsByOldIds context
      .flatMap(
        createPatchItemAndTypeReferencesInTypeElement(
          params.context,
          getRequired(params.context.contentTypeContextByOldIds, type.id, "content type").elementIdsByOldIds,
        ),
      );

    if (!patchOps.length) {
      return Promise.resolve();
    }

    return params.client
      .modifyContentType()
      .byTypeCodename(type.codename)
      .withData(patchOps)
      .toPromise();
  };
