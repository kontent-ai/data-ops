import { ContentTypeContracts, ManagementClient } from "@kontent-ai/management-sdk";

import { zip } from "../../../utils/array.js";
import { serially } from "../../../utils/requests.js";
import { EntityDefinition, ImportContext } from "../entityDefinition.js";
import { contentItemsExportEntity } from "./contentItems.js";
import { createPatchItemAndTypeReferencesInTypeElement,createTransformTypeElement } from "./utils/typeElements.js";

export const contentTypesEntity: EntityDefinition<ReadonlyArray<ContentTypeContracts.IContentTypeContract>> = {
  name: "contentTypes",
  fetchEntities: client => client
    .listContentTypes()
    .toAllPromise()
    .then(res => res.data.items.map(t => t._raw)),
  serializeEntities: collections => JSON.stringify(collections),
  importEntities: async (client, fileTypes, context) => {
    const projectTypes = await serially(fileTypes.map(createInsertTypeFetcher({ context, client })));

    return {
      ...context,
      contentTypeIdsWithElementsByOldIds: new Map(
        zip(fileTypes, projectTypes)
          .map(([fileType, projectType]) => {
            const elementIdEntries = zip(fileType.elements, projectType.elements)
              .map(([fileEl, projectEl]) => [fileEl.id ?? "", projectEl.id ?? ""] as const);

            return [fileType.id, { selfId: projectType.id, elementIdsByOldIds: new Map(elementIdEntries) }];
          })
      ),
    };

  },
  deserializeEntities: JSON.parse,
  dependentImportActions: [
    {
      dependentOnEntities: [contentItemsExportEntity],
      action: async (client, fileTypes, context) => {
        await serially(fileTypes.map(createUpdateTypeItemReferencesFetcher({ client, context })));
      }
    }
  ]
};

type InsertTypeParams = Readonly<{
  client: ManagementClient;
  context: ImportContext;
}>;

const createInsertTypeFetcher = (params: InsertTypeParams) => (type: ContentTypeContracts.IContentTypeContract) => async () => 
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
        elementExternalIdsByOldId: new Map(type.elements.map(el => [el.id ?? "", el.external_id ?? `${type.codename}_${el.codename}`])),
        contentGroupExternalIdByOldId: new Map(type.content_groups?.map(g => [g.id ?? "", g.external_id ?? g.codename ?? ""] as const) ?? []),
      })),
    }))
    .toPromise()
    .then(res => res.rawData);

type UpdateTypeParams = Readonly<{
  client: ManagementClient;
  context: ImportContext;
}>;

const createUpdateTypeItemReferencesFetcher = (params: UpdateTypeParams) => (type: ContentTypeContracts.IContentTypeContract) => () => {
  const patchOps = type.elements
    .flatMap(createPatchItemAndTypeReferencesInTypeElement(params.context, c => c.contentTypeIdsWithElementsByOldIds.get(type.id)?.elementIdsByOldIds));

  if (!patchOps.length) {
    return Promise.resolve();
  }

  return params.client
    .modifyContentType()
    .byTypeId(params.context.contentTypeIdsWithElementsByOldIds.get(type.id)?.selfId ?? "")
    .withData(patchOps)
    .toPromise();
};
