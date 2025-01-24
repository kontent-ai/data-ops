import {
  ContentTypeContracts,
  ContentTypeElements,
  ElementContracts,
  ManagementClient,
  SharedModels,
} from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logInfo, LogOptions } from "../../../../log.js";
import { zip } from "../../../../utils/array.js";
import { serially } from "../../../../utils/requests.js";
import { MapValues, Replace, ReplaceReferences, RequiredId } from "../../../../utils/types.js";
import { getRequired } from "../../utils/utils.js";
import { EntityDefinition, EntityRestoreDefinition, RestoreContext } from "../entityDefinition.js";
import {
  createPatchItemAndTypeReferencesInTypeElement,
  createTransformTypeElement,
  MultiChoiceElement,
} from "./utils/typeElements.js";

type Type = Replace<
  ReplaceReferences<ContentTypeContracts.IContentTypeContract>,
  {
    elements: ReadonlyArray<TypeElement>;
    content_groups?: ReadonlyArray<ElementGroup>;
  }
>;
type TypeElement = RequiredId<ReplaceReferences<ElementContracts.IContentTypeElementContract>>;
type ElementGroup = RequiredId<ContentTypeContracts.IContentTypeGroup>;

export const contentTypesEntity = {
  name: "contentTypes",
  displayName: "contentTypes",
  fetchEntities: client =>
    client
      .listContentTypes()
      .toAllPromise()
      .then(res => res.data.items.map(t => t._raw as Type)),
  serializeEntities: collections => JSON.stringify(collections),
  importEntities: async (client, { entities: fileTypes, context, logOptions }) => {
    const projectTypes = await serially(fileTypes.map(createInsertTypeFetcher({ context, client, logOptions })));

    return {
      ...context,
      contentTypeContextByOldIds: new Map(zip(fileTypes, projectTypes).map(createMakeTypeContextByOldIdEntry(context))),
    };
  },
  deserializeEntities: JSON.parse,
  cleanEntities: async (client, types) => {
    if (!types.length) {
      return;
    }

    await serially(
      types.map(
        (type) => () =>
          client
            .deleteContentType()
            .byTypeId(type.id)
            .toPromise(),
      ),
    ).then((res) =>
      res
        .filter((e) => e instanceof SharedModels.ContentManagementBaseKontentError)
        .map((e) => Promise.reject(e))[0]
    );
  },
} as const satisfies EntityDefinition<ReadonlyArray<Type>>;

export const updateItemAndTypeReferencesInTypesImportEntity = {
  name: contentTypesEntity.name,
  displayName: "references in contentTypes",
  deserializeEntities: JSON.parse,
  importEntities: async (client, { entities: fileTypes, context, logOptions }) => {
    await serially(fileTypes.map(createUpdateTypeItemReferencesFetcher({ client, context, logOptions })));
  },
} as const satisfies EntityRestoreDefinition<ReadonlyArray<Type>>;

type InsertTypeParams = Readonly<{
  client: ManagementClient;
  context: RestoreContext;
  logOptions: LogOptions;
}>;

type SnippetElement = ReplaceReferences<ContentTypeElements.ISnippetElement>;

const createMakeTypeContextByOldIdEntry = (context: RestoreContext) =>
(
  [fileType, projectType]: readonly [Type, Type],
): readonly [string, MapValues<RestoreContext["contentTypeContextByOldIds"]>] => {
  const elementIdEntries = zip(fileType.elements, projectType.elements)
    .flatMap(([fileEl, projectEl]) => {
      if (fileEl.type === "snippet") {
        const typedEl = fileEl as unknown as SnippetElement;
        return [
          ...getRequired(context.contentTypeSnippetContextByOldIds, typedEl.snippet.id, "snippet")
            .elementIdsByOldIds,
        ];
      }

      return [[fileEl.id, projectEl.id] as const];
    });

  return [fileType.id, {
    selfId: projectType.id,
    elementIdsByOldIds: new Map(elementIdEntries),
    elementTypeByOldIds: new Map(
      fileType.elements
        .flatMap(el => {
          if (el.type === "snippet") {
            const typedEl = el as unknown as SnippetElement;
            return [
              ...getRequired(context.contentTypeSnippetContextByOldIds, typedEl.snippet.id, "snippet")
                .elementTypeByOldIds,
            ];
          }

          return [[el.id, el.type]];
        }),
    ),
    multiChoiceOptionIdsByOldIdsByOldElementId: new Map(
      fileType.elements
        .flatMap(el => {
          switch (el.type) {
            case "snippet": {
              const typedEl = el as unknown as SnippetElement;
              return [
                ...getRequired(context.contentTypeSnippetContextByOldIds, typedEl.snippet.id, "snippet")
                  .multiChoiceOptionIdsByOldIdsByOldElementId,
              ];
            }
            case "multiple_choice": {
              const typedEl = el as MultiChoiceElement;
              const typedProjectEl = projectType.elements.find(e => e.codename === el.codename) as MultiChoiceElement;

              return [[
                el.id,
                new Map(
                  zip(typedEl.options, typedProjectEl.options).map(([fO, pO]) => [fO.id, pO.id]),
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

const createInsertTypeFetcher = (params: InsertTypeParams) => (type: Type) => async () => {
  logInfo(params.logOptions, "verbose", `Importing: type ${type.id} (${chalk.yellow(type.name)})`);

  const makeGroupFallbackExternalId = (groupCodename: string | undefined) => `${type.codename}_${groupCodename}_group`;

  const getElementContentGroupCodename = (element: TypeElement) =>
    type.content_groups?.find(g => g.id === (element as ContentTypeElements.Element).content_group?.id)
      ?.codename ?? "default";

  return params.client
    .addContentType()
    .withData(builder => ({
      name: type.name,
      codename: type.codename,
      external_id: type.external_id ?? type.codename,
      content_groups: type.content_groups?.map(g => ({
        ...g,
        external_id: g.external_id ?? makeGroupFallbackExternalId(g.codename),
      })),
      elements: type.elements.map(createTransformTypeElement({
        ...params,
        builder,
        typeOrSnippetCodename: type.codename,
        elementExternalIdsByOldId: new Map(
          type.elements.map(
            el => [
              el.id,
              el.external_id
                ?? `${type.codename}_${getElementContentGroupCodename(el)}_${el.codename}_element`,
            ],
          ),
        ),
        contentGroupExternalIdByOldId: new Map(
          type.content_groups
            ?.map(g => [g.id, g.external_id ?? makeGroupFallbackExternalId(g.codename)] as const) ?? [],
        ),
      })),
    }))
    .toPromise()
    .then(res => res.rawData as Type);
};

type UpdateTypeParams = Readonly<{
  client: ManagementClient;
  context: RestoreContext;
  logOptions: LogOptions;
}>;

const createUpdateTypeItemReferencesFetcher = (params: UpdateTypeParams) => (type: Type) => () => {
  const patchOps = type.elements
    .filter(el => el.type !== "snippet") // We don't need to update snippet elements and snippets are expanded (not present) in the elementIdsByOldIds context
    .flatMap(
      createPatchItemAndTypeReferencesInTypeElement(
        params.context,
        getRequired(params.context.contentTypeContextByOldIds, type.id, "content type").elementIdsByOldIds,
        params.logOptions,
      ),
    );

  if (!patchOps.length) {
    return Promise.resolve();
  }

  logInfo(params.logOptions, "verbose", `Patching: type ${type.id} (${chalk.yellow(type.name)}) with new references`);

  return params.client
    .modifyContentType()
    .byTypeCodename(type.codename)
    .withData(patchOps)
    .toPromise();
};
