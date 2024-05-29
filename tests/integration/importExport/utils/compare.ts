import { expect } from "@jest/globals";
import {
  AssetContracts,
  AssetFolderContracts,
  ContentItemContracts,
  ContentTypeContracts,
  ContentTypeElements,
  ContentTypeSnippetContracts,
  ElementContracts,
  LanguageVariantContracts,
  LanguageVariantElements,
  PreviewContracts,
  RoleContracts,
  SpaceContracts,
  TaxonomyContracts,
  WorkflowContracts,
} from "@kontent-ai/management-sdk";
import { config as dotenvConfig } from "dotenv";

import { replaceRichTextReferences } from "../../../../src/commands/importExportEntities/entities/utils/richText";
import { AllEnvData, loadAllEnvData } from "./envData";

dotenvConfig();

const { API_KEY } = process.env;

if (!API_KEY) {
  throw new Error("API_KEY is missing in environment variables.");
}

export type FilterParam = { include: ReadonlyArray<keyof AllEnvData> } | { exclude: ReadonlyArray<keyof AllEnvData> };

export const expectSameEnvironments = async (
  environmentId1: string,
  environmentId2: string,
  filterParam: FilterParam = { exclude: [] },
): Promise<void> => {
  const data1 = await loadAllEnvData(environmentId1).then(prepareReferences);
  const data2 = await loadAllEnvData(environmentId2).then(prepareReferences);

  expectSameAllEnvData(data1, data2, filterParam);
};

export const expectSameSyncEnvironments = async (
  environmentId1: string,
  environmentId2: string,
  filterParam: FilterParam = { include: ["types", "snippets", "taxonomies"] },
): Promise<void> => {
  const data1 = await loadAllEnvData(environmentId1, { include: ["types", "snippets", "taxonomies"] }).then(
    prepareReferences,
  );
  const data2 = await loadAllEnvData(environmentId2, { include: ["types", "snippets", "taxonomies"] }).then(
    prepareReferences,
  );

  expectSameAllEnvData(data1, data2, filterParam);
};

export const expectSameAllEnvData = (
  data1: AllEnvData,
  data2: AllEnvData,
  filterParam: FilterParam = { exclude: [] },
) => {
  const has = (e: keyof AllEnvData) =>
    "exclude" in filterParam
      ? !filterParam.exclude.includes(e)
      : filterParam.include.includes(e);

  const sortedVariants = (data: AllEnvData) => sortBy(data.variants, v => `${v.item.id};${v.language.id}`);

  // disabling unused expressions here as they are a lot more compact then ifs and a lot of them is necessary here
  /* eslint-disable @typescript-eslint/no-unused-expressions */
  has("collections") && expect(sortByCodename(data1.collections)).toStrictEqual(sortByCodename(data2.collections));
  has("spaces") && expect(sortByCodename(data1.spaces)).toStrictEqual(sortByCodename(data2.spaces));
  has("languages") && expect(sortByCodename(data1.languages)).toStrictEqual(sortByCodename(data2.languages));
  has("previewUrls") && expect(data1.previewUrls).toStrictEqual(data2.previewUrls);
  has("taxonomies") && expect(sortByCodename(data1.taxonomies)).toStrictEqual(sortByCodename(data2.taxonomies));
  has("assetFolders") && expect(data1.assetFolders).toStrictEqual(data2.assetFolders);
  has("assets") && expect(sortByCodename(data1.assets)).toStrictEqual(sortByCodename(data2.assets));
  has("roles") && expect(sortBy(data1.roles, r => r.name)).toStrictEqual(sortBy(data2.roles, r => r.name));
  has("workflows") && expect(sortByCodename(data1.workflows)).toStrictEqual(sortByCodename(data2.workflows));
  has("snippets") && expect(sortByCodename(data1.snippets)).toStrictEqual(sortByCodename(data2.snippets));
  has("types")
    && expect(
      sortByCodename(
        data1.types.map(t => ({
          ...t,
          elements: t.content_groups?.length ? sortTypesElements(t.elements) : t.elements,
        })),
      ),
    ).toStrictEqual(
      sortByCodename(data2.types.map(t => ({
        ...t,
        elements: t.content_groups?.length ? sortTypesElements(t.elements) : t.elements,
      }))),
    );
  has("items") && expect(sortByCodename(data1.items)).toStrictEqual(sortByCodename(data2.items));
  has("variants") && expect(sortedVariants(data1)).toStrictEqual(sortedVariants(data2));
  /* eslint-enable @typescript-eslint/no-unused-expressions */
};

const sortBy = <T>(entities: ReadonlyArray<T>, sortByPicker: (e: T) => string): ReadonlyArray<T> =>
  [...entities].sort((e1, e2) => sortByPicker(e1).localeCompare(sortByPicker(e2)));

const sortByCodename = <T extends { readonly codename: string }>(entities: ReadonlyArray<T>): ReadonlyArray<T> =>
  sortBy(entities, e => e.codename);

const sortTypesElements = (elements: ElementContracts.IContentTypeElementContract[]) =>
  elements.toSorted((e1, e2) => (e1 as any).content_group.id < (e2 as any).content_group.id ? -2 : 0);

const prepareReferences = (data: AllEnvData): AllEnvData => ({
  collections: data.collections.map(c => ({ ...c, id: "-", external_id: "-" })),
  spaces: data.spaces.map(createPrepareSpaceReferences(data)),
  languages: data.languages.map((l, _, allLanguages) => ({
    ...l,
    id: "-",
    external_id: "-",
    fallback_language: l.fallback_language
      ? { id: allLanguages.find(e => e.id === l.fallback_language?.id)?.codename ?? "non-existing-language" }
      : undefined,
  })),
  previewUrls: createPreparePreviewUrlReferences(data)(data.previewUrls),
  taxonomies: data.taxonomies.map(prepareTaxonomyReferences),
  assetFolders: data.assetFolders.map(prepareFolderReferences),
  assets: data.assets.map(createPrepareAssetReferences(data)),
  roles: data.roles.map(prepareRoleReferences),
  workflows: data.workflows.map(createPrepareWorkflowReferences(data)),
  snippets: data.snippets.map(createPrepareSnippetReferences(data)),
  types: data.types.map(createPrepareTypeReferences(data)),
  items: data.items.map(createPrepareItemReferences(data)),
  variants: data.variants.map(createPrepareVariantReferences(data)),
});

type PrepareReferencesCreator<T> = (data: AllEnvData) => PrepareReferencesFnc<T>;
type PrepareReferencesFnc<T> = (entity: T) => T;

const createPrepareSpaceReferences: PrepareReferencesCreator<SpaceContracts.ISpaceContract> = data => space => ({
  ...space,
  id: "-",
  web_spotlight_root_item: space.web_spotlight_root_item
    ? { id: data.items.find(i => i.id === space.web_spotlight_root_item?.id)?.codename }
    : undefined,
});

const createPreparePreviewUrlReferences: PrepareReferencesCreator<PreviewContracts.IPreviewConfigurationContract> =
  data => previewUrls => ({
    ...previewUrls,
    space_domains: previewUrls.space_domains.map(sD => ({
      ...sD,
      space: { id: data.spaces.find(s => s.id === sD.space.id)?.codename ?? "non-existing-space" },
    })),
    preview_url_patterns: previewUrls.preview_url_patterns.map(pattern => ({
      ...pattern,
      content_type: { id: data.types.find(t => t.id === pattern.content_type.id)?.codename ?? "non-existing-type" },
      url_patterns: pattern.url_patterns.map(p => ({
        ...p,
        space: { id: data.spaces.find(s => s.id === p.space?.id)?.codename ?? "non-existing-space" },
      })),
    })),
  });

const prepareTaxonomyReferences: PrepareReferencesFnc<TaxonomyContracts.ITaxonomyContract> = taxonomy => ({
  ...taxonomy,
  id: "-",
  last_modified: "-",
  external_id: "-",
  terms: taxonomy.terms.map(prepareTaxonomyReferences),
});

const prepareFolderReferences: PrepareReferencesFnc<AssetFolderContracts.IAssetFolderContract> = folder => ({
  ...folder,
  id: "-",
  external_id: "-",
  folders: folder.folders.map(prepareFolderReferences),
});

const createPrepareAssetReferences: PrepareReferencesCreator<AssetContracts.IAssetModelContract> = data => asset => ({
  ...asset,
  id: "-",
  last_modified: "-",
  external_id: "-",
  url: "-",
  size: 666, // This can be flaky and there is not a big potential for a real bug with this property
  folder: asset.folder ? { id: data.assetFolders.find(f => f.id === asset.folder?.id)?.name } : undefined,
  collection: asset.collection
    ? {
      reference: {
        id: data.collections.find(c => c.id === asset.collection?.reference?.id)?.codename
          ?? "non-existing-collection",
      },
    }
    : undefined,
  file_reference: {
    ...asset.file_reference,
    id: "-",
  },
  descriptions: asset.descriptions
    .map(d => ({
      description: d.description,
      language: { id: data.languages.find(l => l.id === d.language.id)?.codename ?? "non-existing-language" },
    })),
});

const createPrepareWorkflowReferences: PrepareReferencesCreator<WorkflowContracts.IWorkflowContract> =
  data => workflow => ({
    ...workflow,
    id: "-",
    external_id: "-",
    scopes: workflow.scopes.map(s => ({
      ...s,
      collections: s.collections
        .map(ref => ({ id: data.collections.find(c => c.id === ref.id)?.codename ?? "non-existing-collection" })),
      content_types: s.content_types
        .map(ref => ({ id: data.types.find(t => t.id === ref.id)?.codename ?? "non-existing-type" })),
    })),
    archived_step: {
      ...workflow.archived_step,
      id: "archived_step",
      role_ids: [],
    },
    published_step: {
      ...workflow.published_step,
      id: "published_step",
      unpublish_role_ids: [],
      create_new_version_role_ids: [],
    },
    scheduled_step: {
      ...workflow.scheduled_step,
      id: "scheduled_step",
      unpublish_role_ids: [],
      create_new_version_role_ids: [],
    },
    steps: workflow.steps.map(s => ({
      ...s,
      id: "-",
      external_id: "-",
      role_ids: [],
      transitions_to: s.transitions_to.map(t => ({
        step: { id: workflow.steps.find(step => step.id === t.step.id)?.codename ?? "non-existing-step" },
      })),
    })),
  });

const createPrepareSnippetReferences: PrepareReferencesCreator<
  ContentTypeSnippetContracts.IContentTypeSnippetContract
> = data => snippet => ({
  ...snippet,
  id: "-",
  last_modified: "-",
  external_id: "-",
  elements: snippet.elements
    .map(createPrepareTypeElementReferences(data, snippet.elements, [])),
});

const createPrepareTypeReferences: PrepareReferencesCreator<ContentTypeContracts.IContentTypeContract> =
  data => type => ({
    ...type,
    id: "-",
    last_modified: "-",
    external_id: "-",
    content_groups: type.content_groups?.map(g => ({ ...g, id: "-", external_id: "-" })),
    elements: type.elements
      .map(createPrepareTypeElementReferences(data, type.elements, type.content_groups ?? [])),
  });

const createPrepareTypeElementReferences = (
  data: AllEnvData,
  otherElements: ReadonlyArray<ElementContracts.IContentTypeElementContract>,
  contentGroups: ReadonlyArray<ContentTypeContracts.IContentTypeGroup>,
): PrepareReferencesFnc<ElementContracts.IContentTypeElementContract> =>
element => {
  const elementWithGroup = element as (ElementContracts.IContentTypeElementContract & ContentTypeElements.Element);
  const baseElement: ElementContracts.IContentTypeElementContract & ContentTypeElements.Element = {
    ...elementWithGroup,
    id: "-",
    external_id: "-",
    content_group: elementWithGroup.content_group
      ? {
        id: contentGroups.find(g => g.id === elementWithGroup.content_group?.id)?.codename
          ?? "non-existing-content-group",
      }
      : undefined,
  };
  switch (baseElement.type) {
    case "asset": {
      const result: ContentTypeElements.IAssetElement = {
        ...baseElement,
        default: baseElement.default
          ? {
            global: {
              value: baseElement.default.global.value.map(ref => ({
                id: data.assets.find(a => a.id === ref.id)?.codename ?? "non-existing-asset",
              })),
            },
          }
          : undefined,
      };
      return result;
    }
    case "custom": {
      const result: ContentTypeElements.ICustomElement = {
        ...baseElement,
        allowed_elements: baseElement.allowed_elements
          ?.map(ref => ({ id: otherElements.find(el => el.id === ref.id)?.codename ?? "non-existing-element" })),
      };

      return result;
    }
    case "date_time":
    case "number":
    case "text":
      return baseElement;
    case "guidelines": {
      const result: ContentTypeElements.IGuidelinesElement = {
        ...baseElement,
        guidelines: replaceRichTextReferences({
          richText: baseElement.guidelines,
          replaceItemId: (itemId, asInternalId, asExternalId) => {
            const item = data.items.find(i => i.id === itemId);
            return item
              ? asInternalId(item.codename)
              : asExternalId("non-existing-item");
          },
          replaceAssetId: (assetId, asInternalId, asExternalId) => {
            const asset = data.assets.find(a => a.id === assetId);
            return asset
              ? asInternalId(asset.codename)
              : asExternalId("non-existing-asset");
          },
          replaceItemLinkId: (itemId, asInternalId, asExternalId) => {
            const item = data.items.find(i => i.id === itemId);
            return item
              ? asInternalId(item.codename)
              : asExternalId("non-existing-item");
          },
        })
          .replaceAll(assetExternalIdRegex, () => `${assetExternalIdAttributeName}="non-existing-asset"`)
          .replaceAll(itemExternalIdRegex, () => `${itemExternalIdAttributeName}="non-existing-item"`)
          .replaceAll(itemLinkExternalIdRegex, () => `${itemLinkExternalIdAttributeName}="non-existing-item"`),
      };

      return result as unknown as ElementContracts.IContentTypeElementContract; // incorrect SDK types
    }
    case "modular_content": {
      const result: ContentTypeElements.ILinkedItemsElement = {
        ...baseElement,
        default: baseElement.default
          ? {
            global: {
              value: baseElement.default.global.value.map(ref => ({
                id: data.items.find(i => i.id === ref.id)?.codename ?? "non-existing-item",
              })),
            },
          }
          : undefined,
        allowed_content_types: baseElement.allowed_content_types
          ?.map(ref => ({ id: data.types.find(t => t.id === ref.id)?.codename ?? "non-existing-type" }))
          .toSorted((e1, e2) => e1.id < e2.id ? -1 : 0),
      };

      return result;
    }
    case "multiple_choice": {
      const result: ContentTypeElements.IMultipleChoiceElement = {
        ...baseElement,
        options: baseElement.options.map(o => ({ ...o, id: o.codename ?? "non-existing-option", external_id: "-" })),
        default: baseElement.default
          ? {
            global: {
              value: baseElement.default.global.value.map(ref => ({
                id: baseElement.options.find(o => o.id === ref.id)?.codename ?? "non-existing-option",
              })),
            },
          }
          : undefined,
      };

      return result;
    }
    case "rich_text": {
      const result: ContentTypeElements.IRichTextElement = {
        ...baseElement,
        allowed_table_formatting: baseElement.allowed_table_formatting?.toSorted(),
        allowed_formatting: baseElement.allowed_formatting?.toSorted(),
        allowed_content_types: baseElement.allowed_content_types
          ?.map(ref => ({ id: data.types.find(t => t.id === ref.id)?.codename ?? "non-existing-type" }))
          .toSorted((e1, e2) => e1.id < e2.id ? -1 : 0),
        allowed_item_link_types: baseElement.allowed_item_link_types
          ?.map(ref => ({ id: data.types.find(t => t.id === ref.id)?.codename ?? "non-existing-type" }))
          .toSorted((e1, e2) => e1.id < e2.id ? -1 : 0),
      };

      return result;
    }
    case "snippet": {
      const result: ContentTypeElements.ISnippetElement = {
        ...baseElement,
        snippet: { id: data.snippets.find(s => s.id === baseElement.snippet.id)?.codename ?? "non-existing-snippet" },
      };

      return result as unknown as ElementContracts.IContentTypeElementContract;
    }
    case "subpages": {
      type SubPagesElement =
        & ContentTypeElements.ISubpagesElement
        & Pick<ContentTypeElements.ILinkedItemsElement, "default">;
      const typedElement = baseElement as SubPagesElement;

      const result: SubPagesElement = {
        ...typedElement,
        allowed_content_types: typedElement.allowed_content_types
          ?.map(ref => ({ id: data.types.find(t => t.id === ref.id)?.codename ?? "non-existing-type" }))
          .toSorted((e1, e2) => e1.id < e2.id ? -1 : 0),
        default: typedElement.default
          ? {
            global: {
              value: typedElement.default.global.value
                .map(ref => ({ id: data.items.find(i => i.id === ref.id)?.codename ?? "non-existing-item" })),
            },
          }
          : undefined,
      };

      return result;
    }
    case "taxonomy": {
      const result: ContentTypeElements.ITaxonomyElement = {
        ...baseElement,
        taxonomy_group: {
          id: data.taxonomies.find(g => g.id === baseElement.taxonomy_group.id)?.codename ?? "non-existing-group",
        },
        default: baseElement.default
          ? {
            global: {
              value: baseElement.default.global.value.map(ref => ({
                id:
                  getAllTerms(data.taxonomies.find(g => g.id === baseElement.taxonomy_group.id)).find(t =>
                    t.id === ref.id
                  )?.codename ?? "non-existing-term",
              })),
            },
          }
          : undefined,
      };

      return result as ElementContracts.IContentTypeElementContract;
    }
    case "url_slug": {
      const result: ContentTypeElements.IUrlSlugElement = {
        ...baseElement,
        depends_on: {
          element: {
            id: baseElement.depends_on.snippet
              ? data.snippets
                .find(s => s.id === baseElement.depends_on.snippet?.id)
                ?.elements.find(el => el.id === baseElement.depends_on.element.id)?.codename ?? "non-existing-element"
              : otherElements
                .find(el => el.id === baseElement.depends_on.element.id)?.codename ?? "non-existing-element",
          },
          snippet: baseElement.depends_on.snippet
            ? {
              id: data.snippets
                .find(s => s.id === baseElement.depends_on.snippet?.id)?.codename ?? "non-existing-snippet",
            }
            : undefined,
        },
      };

      return result;
    }
    default:
      throw new Error(`Found a type element that is of an unknown type "${element.type}".`);
  }
};

const createPrepareItemReferences: PrepareReferencesCreator<ContentItemContracts.IContentItemModelContract> =
  data => item => ({
    ...item,
    id: "-",
    external_id: "-",
    last_modified: new Date(1316, 4, 14),
    type: { id: data.types.find(t => t.id === item.type.id)?.codename ?? "non-existing-type" },
    collection: { id: data.collections.find(c => c.id === item.collection.id)?.codename ?? "non-existing-collection" },
  });

const createPrepareVariantReferences: PrepareReferencesCreator<LanguageVariantContracts.ILanguageVariantModelContract> =
  data => variant => ({
    item: { id: data.items.find(i => i.id === variant.item.id)?.codename ?? "non-existing-item" },
    last_modified: "-",
    language: { id: data.languages.find(l => l.id === variant.language.id)?.codename ?? "non-existing-language" },
    workflow: {
      workflow_identifier: {
        id: data.workflows
          .find(wf => wf.id === variant.workflow.workflow_identifier.id)?.codename
          ?? "non-existing-workflow",
      },
      step_identifier: {
        id: data.workflows.map(wf => wf.scheduled_step.id).includes(variant.workflow.step_identifier.id ?? "") // TODO: remove once we schedule variants when importing (currently it is not possible and scheduled variants are put to draft)
          ? data.workflows
            .find(wf => wf.id === variant.workflow.workflow_identifier.id)
            ?.steps[0]?.codename
            ?? "non-existing-step"
          : data.workflows
            .flatMap(getAllSteps)
            .find(step => step.id === variant.workflow.step_identifier.id)?.codename
            ?? "non-existing-step",
      },
    },
    workflow_step: {
      id: data.workflows.map(wf => wf.scheduled_step.id).includes(variant.workflow_step.id ?? "") // TODO: remove once we schedule variants when importing (currently it is not possible and scheduled variants are put to draft)
        ? data.workflows
          .find(wf => wf.id === variant.workflow.workflow_identifier.id)
          ?.steps[0]?.codename
          ?? "non-existing-step"
        : data.workflows
          .flatMap(getAllSteps)
          .find(step => step.id === variant.workflow_step.id)?.codename
          ?? "non-existing-step",
    },
    elements: variant.elements.map(createPrepareVariantElementReferences(data)),
  });

const createPrepareVariantElementReferences: PrepareReferencesCreator<ElementContracts.IContentItemElementContract> =
  data => element => {
    const typeElement = data.types
      .flatMap(t => t.elements)
      .concat(data.snippets.flatMap(s => s.elements))
      .find(el => el.id === element.element.id);

    if (!typeElement) {
      throw new Error(
        `Found element "${
          JSON.stringify(element)
        }" that doesn't have any matching element in any type or snippet. If this happens, please re-save the variant and re-export data to fix it.`,
      );
    }
    const baseElement = { ...element, element: { id: typeElement.codename } };

    switch (typeElement.type) {
      case "asset": {
        const typedElement = baseElement as LanguageVariantElements.IAssetInVariantElement;

        const result: LanguageVariantElements.IAssetInVariantElement = {
          ...typedElement,
          value: typedElement.value
            ?.map(ref => ({ id: data.assets.find(a => a.id === ref.id)?.codename ?? "non-existing-asset" }))
            ?? [],
        };

        return result as ElementContracts.IContentItemElementContract;
      }
      case "modular_content": {
        const typedElement = baseElement as LanguageVariantElements.ILinkedItemsInVariantElement;

        const result: LanguageVariantElements.ILinkedItemsInVariantElement = {
          ...typedElement,
          value: typedElement.value
            ?.map(ref => ({ id: data.items.find(a => a.id === ref.id)?.codename ?? "non-existing-item" }))
            ?? [],
        };

        return result as ElementContracts.IContentItemElementContract;
      }
      case "multiple_choice": {
        const typedElement = baseElement as LanguageVariantElements.IMultipleChoiceInVariantElement;
        const typedTypeElement = typeElement as ContentTypeElements.IMultipleChoiceElement;

        const result: LanguageVariantElements.IMultipleChoiceInVariantElement = {
          ...typedElement,
          value: typedElement.value
            ?.map(ref => ({
              id: typedTypeElement.options.find(o => o.id === ref.id)?.codename ?? "non-existing-option",
            }))
            ?? [],
        };

        return result as ElementContracts.IContentItemElementContract;
      }
      case "rich_text": {
        const typedElement = baseElement as LanguageVariantElements.IRichtextInVariantElement;

        const result: LanguageVariantElements.IRichtextInVariantElement = {
          ...typedElement,
          value: replaceRichTextReferences({
            richText: typedElement.value ?? "",
            replaceItemId: (id, asInternal, asExternal) => {
              const item = data.items.find(i => i.id === id);

              return item ? asInternal(item.codename) : asExternal("component-or-non-existing-item");
            },
            replaceAssetId: (id, asInternal, asExternal) => {
              const asset = data.assets.find(a => a.id === id);

              return asset ? asInternal(asset.codename) : asExternal("non-existing-asset");
            },
            replaceItemLinkId: (id, asInternal, asExternal) => {
              const item = data.items.find(i => i.id === id);

              return item ? asInternal(item.codename) : asExternal("non-existing-item");
            },
          })
            .replaceAll(assetExternalIdRegex, () => ` ${assetExternalIdAttributeName}="non-existing-asset"`)
            .replaceAll(itemExternalIdRegex, () => ` ${itemExternalIdAttributeName}="non-existing-item"`)
            .replaceAll(itemLinkExternalIdRegex, () => ` ${itemLinkExternalIdAttributeName}="non-existing-item"`),
          components: typedElement.components?.map(component => ({
            id: "-",
            type: { id: data.types.find(t => t.id === component.type.id)?.codename ?? "non-existing-type" },
            elements: component.elements.map(createPrepareVariantElementReferences(data)),
          })),
        };

        return result as ElementContracts.IContentItemElementContract;
      }
      case "subpages": {
        const typedElement = element as LanguageVariantElements.ILinkedItemsInVariantElement;

        const result: LanguageVariantElements.ILinkedItemsInVariantElement = {
          ...typedElement,
          element: { id: "-" },
          value: typedElement.value
            ?.map(ref => ({ id: data.items.find(i => i.id === ref.id)?.codename ?? "non-existing-item" }))
            ?? [],
        };

        return result as ElementContracts.IContentItemElementContract;
      }
      case "taxonomy": {
        const typedElement = element as LanguageVariantElements.ITaxonomyInVariantElement;
        const typedTypeElement = typeElement as ContentTypeElements.ITaxonomyElement;

        const result: LanguageVariantElements.ITaxonomyInVariantElement = {
          ...typedElement,
          element: { id: "-" },
          value: typedElement.value
            ?.map(ref => ({
              id: getAllTerms(
                data.taxonomies.find(g => g.id === typedTypeElement.taxonomy_group.id),
              )
                .find(t => t.id === ref.id)
                ?.codename
                ?? "non-existing-asset",
            }))
            ?? [],
        };

        return result as ElementContracts.IContentItemElementContract;
      }
      case "custom":
      case "date_time":
      case "number":
      case "text":
      case "url_slug":
        return baseElement;
      default:
        throw new Error(`Found element of an unknown type "${typeElement.type}". This should not happen.`);
    }
  };

const prepareRoleReferences: PrepareReferencesFnc<RoleContracts.IRoleContract> = role => ({
  ...role,
  id: "-",
});

const getAllTerms = (
  group: TaxonomyContracts.ITaxonomyContract | undefined,
): ReadonlyArray<TaxonomyContracts.ITaxonomyContract> =>
  group
    ? [
      group,
      ...group.terms.flatMap(getAllTerms),
    ]
    : [];

const getAllSteps = (workflow: WorkflowContracts.IWorkflowContract) => [
  workflow.published_step,
  workflow.scheduled_step,
  workflow.archived_step,
  ...workflow.steps,
];

const itemExternalIdAttributeName = "data-external-id";
const itemLinkExternalIdAttributeName = "data-item-external-id";
const assetExternalIdAttributeName = "data-asset-external-id";

const itemExternalIdRegex = new RegExp(`\\s+${itemExternalIdAttributeName}="(.+)"`, "gi");
const itemLinkExternalIdRegex = new RegExp(`\\s+${itemLinkExternalIdAttributeName}="(.+)"`, "gi");
const assetExternalIdRegex = new RegExp(`\\s+${assetExternalIdAttributeName}="(.+)"`, "gi");
