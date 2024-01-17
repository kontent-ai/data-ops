import { expect } from "@jest/globals";
import {
  AssetContracts,
  AssetFolderContracts,
  CollectionContracts,
  ContentItemContracts,
  ContentTypeContracts,
  ContentTypeElements,
  ContentTypeSnippetContracts,
  ElementContracts,
  LanguageContracts,
  ManagementClient,
  PreviewContracts,
  RoleContracts,
  SpaceContracts,
  TaxonomyContracts,
  WorkflowContracts,
} from "@kontent-ai/management-sdk";

import { replaceRichTextReferences } from "../../../../src/commands/importExportEntities/entities/utils/richText";

const { API_KEY } = process.env;

if (!API_KEY) {
  throw new Error("API_KEY is missing in environment variables.");
}

export const expectSameEnvironments = async (
  environmentId1: string,
  environmentId2: string,
  excludeEntities: ReadonlyArray<keyof AllData> = [],
): Promise<void> => {
  const client1 = new ManagementClient({
    apiKey: API_KEY,
    environmentId: environmentId1,
  });
  const client2 = new ManagementClient({
    apiKey: API_KEY,
    environmentId: environmentId2,
  });
  const has = (e: keyof AllData) => !excludeEntities.includes(e);

  const data1 = await loadAllData(client1).then(prepareReferences);
  const data2 = await loadAllData(client2).then(prepareReferences);

  // disabling unused expressions here as they are a lot more compact then ifs and a lot of them is necessary here
  /* eslint-disable @typescript-eslint/no-unused-expressions */
  has("collections") && expect(sortByCodename(data1.collections)).toStrictEqual(sortByCodename(data2.collections));
  has("spaces") && expect(sortByCodename(data1.spaces)).toStrictEqual(sortByCodename(data2.spaces));
  has("languages") && expect(sortByCodename(data1.languages)).toStrictEqual(sortByCodename(data2.languages));
  has("previewUrls") && expect(data1.previewUrls).toStrictEqual(data2.previewUrls);
  has("taxonomies") && expect(sortByCodename(data1.taxonomies)).toStrictEqual(sortByCodename(data2.taxonomies));
  has("assetFolders") && expect(data1.assetFolders).toStrictEqual(data2.assetFolders);
  has("assets") && expect(sortByCodename(data1.assets)).toStrictEqual(sortByCodename(data2.assets));
  has("roles") && expect(data1.roles).toStrictEqual(data2.roles);
  has("workflows") && expect(sortByCodename(data1.workflows)).toStrictEqual(sortByCodename(data2.workflows));
  has("snippets") && expect(sortByCodename(data1.snippets)).toStrictEqual(sortByCodename(data2.snippets));
  has("types") && expect(sortByCodename(data1.types)).toStrictEqual(sortByCodename(data2.types));
  has("items") && expect(sortByCodename(data1.items)).toStrictEqual(sortByCodename(data2.items));
  /* eslint-enable @typescript-eslint/no-unused-expressions */
};

const compareOnCodename = (
  e1: { readonly codename: string },
  e2: { readonly codename: string },
) => e1.codename.localeCompare(e2.codename);

const sortByCodename = <T extends { readonly codename: string }>(entities: ReadonlyArray<T>): ReadonlyArray<T> =>
  [...entities].sort(compareOnCodename);

type AllData = Readonly<{
  collections: ReadonlyArray<CollectionContracts.ICollectionContract>;
  spaces: ReadonlyArray<SpaceContracts.ISpaceContract>;
  languages: ReadonlyArray<LanguageContracts.ILanguageModelContract>;
  previewUrls: PreviewContracts.IPreviewConfigurationContract;
  taxonomies: ReadonlyArray<TaxonomyContracts.ITaxonomyContract>;
  assetFolders: ReadonlyArray<AssetFolderContracts.IAssetFolderContract>;
  assets: ReadonlyArray<AssetContracts.IAssetModelContract>;
  roles: ReadonlyArray<RoleContracts.IRoleContract>;
  workflows: ReadonlyArray<WorkflowContracts.IWorkflowContract>;
  snippets: ReadonlyArray<ContentTypeSnippetContracts.IContentTypeSnippetContract>;
  types: ReadonlyArray<ContentTypeContracts.IContentTypeContract>;
  items: ReadonlyArray<ContentItemContracts.IContentItemModelContract>;
}>;

const loadAllData = async (client: ManagementClient): Promise<AllData> => ({
  collections: await client
    .listCollections()
    .toPromise()
    .then(res => res.rawData.collections),
  spaces: await client
    .listSpaces()
    .toPromise()
    .then(res => res.rawData),
  languages: await client
    .listLanguages()
    .toAllPromise()
    .then(res => res.data.items.map(l => l._raw)),
  previewUrls: await client
    .getPreviewConfiguration()
    .toPromise()
    .then(res => res.rawData),
  taxonomies: await client
    .listTaxonomies()
    .toAllPromise()
    .then(res => res.data.items.map(t => t._raw)),
  assetFolders: await client
    .listAssetFolders()
    .toPromise()
    .then(res => res.rawData.folders),
  assets: await client
    .listAssets()
    .toAllPromise()
    .then(res => res.data.items.map(a => a._raw)),
  roles: await client
    .listRoles()
    .toPromise()
    .then(res => res.rawData.roles),
  workflows: await client
    .listWorkflows()
    .toPromise()
    .then(res => res.rawData),
  snippets: await client
    .listContentTypeSnippets()
    .toAllPromise()
    .then(res => res.data.items.map(s => s._raw)),
  types: await client
    .listContentTypes()
    .toAllPromise()
    .then(res => res.data.items.map(t => t._raw)),
  items: await client
    .listContentItems()
    .toAllPromise()
    .then(res => res.data.items.map(i => i._raw)),
});

const prepareReferences = (data: AllData): AllData => ({
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
  roles: data.roles,
  workflows: data.workflows.map(createPrepareWorkflowReferences(data)),
  snippets: data.snippets.map(createPrepareSnippetReferences(data)),
  types: data.types.map(createPrepareTypeReferences(data)),
  items: data.items.map(createPrepareItemReferences(data)),
});

type PrepareReferencesCreator<T> = (data: AllData) => PrepareReferencesFnc<T>;
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
  data: AllData,
  otherElements: ReadonlyArray<ElementContracts.IContentTypeElementContract>,
  contentGroups: ReadonlyArray<ContentTypeContracts.IContentTypeGroup>,
): PrepareReferencesFnc<ElementContracts.IContentTypeElementContract> =>
element => {
  const elementWithGroup =
    element as (ElementContracts.IContentTypeElementContract & ContentTypeElements.IElementShared);
  const baseElement: ElementContracts.IContentTypeElementContract & ContentTypeElements.IElementShared = {
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
      const typedElement = baseElement as ContentTypeElements.IAssetElement;

      const result: ContentTypeElements.IAssetElement = {
        ...typedElement,
        default: typedElement.default
          ? {
            global: {
              value: typedElement.default.global.value.map(ref => ({
                id: data.assets.find(a => a.id === ref.id)?.codename ?? "non-existing-asset",
              })),
            },
          }
          : undefined,
      };
      return result;
    }
    case "custom": {
      const typedElement = baseElement as ContentTypeElements.ICustomElement;

      const result: ContentTypeElements.ICustomElement = {
        ...typedElement,
        allowed_elements: typedElement.allowed_elements
          ?.map(ref => ({ id: otherElements.find(el => el.id === ref.id)?.codename ?? "non-existing-element" })),
      };

      return result;
    }
    case "date_time":
    case "number":
    case "text":
      return baseElement;
    case "guidelines": {
      const typedElement = baseElement as unknown as ContentTypeElements.IGuidelinesElement; // incorrect SDK types

      const result: ContentTypeElements.IGuidelinesElement = {
        ...typedElement,
        guidelines: replaceRichTextReferences({
          richText: typedElement.guidelines,
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
      const typedElement = baseElement as ContentTypeElements.ILinkedItemsElement;

      const result: ContentTypeElements.ILinkedItemsElement = {
        ...typedElement,
        default: typedElement.default
          ? {
            global: {
              value: typedElement.default.global.value.map(ref => ({
                id: data.items.find(i => i.id === ref.id)?.codename ?? "non-existing-item",
              })),
            },
          }
          : undefined,
        allowed_content_types: typedElement.allowed_content_types
          ?.map(ref => ({ id: data.types.find(t => t.id === ref.id)?.codename ?? "non-existing-type" })),
      };

      return result;
    }
    case "multiple_choice": {
      const typedElement = baseElement as ContentTypeElements.IMultipleChoiceElement;

      const result: ContentTypeElements.IMultipleChoiceElement = {
        ...typedElement,
        options: typedElement.options.map(o => ({ ...o, id: o.codename ?? "non-existing-option", external_id: "-" })),
        default: typedElement.default
          ? {
            global: {
              value: typedElement.default.global.value.map(ref => ({
                id: typedElement.options.find(o => o.id === ref.id)?.codename ?? "non-existing-option",
              })),
            },
          }
          : undefined,
      };

      return result;
    }
    case "rich_text": {
      const typedElement = baseElement as ContentTypeElements.IRichTextElement;

      const result: ContentTypeElements.IRichTextElement = {
        ...typedElement,
        allowed_content_types: typedElement.allowed_content_types
          ?.map(ref => ({ id: data.types.find(t => t.id === ref.id)?.codename ?? "non-existing-type" })),
        allowed_item_link_types: typedElement.allowed_item_link_types
          ?.map(ref => ({ id: data.types.find(t => t.id === ref.id)?.codename ?? "non-existing-type" })),
      };

      return result;
    }
    case "snippet": {
      const typedElement = baseElement as unknown as ContentTypeElements.ISnippetElement;

      const result: ContentTypeElements.ISnippetElement = {
        ...typedElement,
        snippet: { id: data.snippets.find(s => s.id === typedElement.snippet.id)?.codename ?? "non-existing-snippet" },
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
          ?.map(ref => ({ id: data.types.find(t => t.id === ref.id)?.codename ?? "non-existing-type" })),
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
      const typedElement = baseElement as ContentTypeElements.ITaxonomyElement;

      const result: ContentTypeElements.ITaxonomyElement = {
        ...typedElement,
        taxonomy_group: {
          id: data.taxonomies.find(g => g.id === typedElement.taxonomy_group.id)?.codename ?? "non-existing-group",
        },
        default: typedElement.default
          ? {
            global: {
              value: typedElement.default.global.value.map(ref => ({
                id:
                  getAllTerms(data.taxonomies.find(g => g.id === typedElement.taxonomy_group.id)).find(t =>
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
      const typedElement = baseElement as ContentTypeElements.IUrlSlugElement;

      const result: ContentTypeElements.IUrlSlugElement = {
        ...typedElement,
        depends_on: {
          element: {
            id: typedElement.depends_on.snippet
              ? data.snippets
                .find(s => s.id === typedElement.depends_on.snippet?.id)
                ?.elements.find(el => el.id === typedElement.depends_on.element.id)?.codename ?? "non-existing-element"
              : otherElements
                .find(el => el.id === typedElement.depends_on.element.id)?.codename ?? "non-existing-element",
          },
          snippet: typedElement.depends_on.snippet
            ? {
              id: data.snippets
                .find(s => s.id === typedElement.depends_on.snippet?.id)?.codename ?? "non-existing-snippet",
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

// const createPrepareVariantReferences: PrepareReferencesCreator<LanguageVariantContracts.ILanguageVariantModelContract> =
//   data => variant => ({
//   ...variant,
//   item: { id: data.items.find(i => i.id === variant.item.id)?.codename ?? ""}
// })

const getAllTerms = (
  group: TaxonomyContracts.ITaxonomyContract | undefined,
): ReadonlyArray<TaxonomyContracts.ITaxonomyContract> =>
  group
    ? [
      group,
      ...group.terms.flatMap(getAllTerms),
    ]
    : [];

const itemExternalIdAttributeName = "data-external-id";
const itemLinkExternalIdAttributeName = "data-item-external-id";
const assetExternalIdAttributeName = "data-asset-external-id";

const itemExternalIdRegex = new RegExp(`${itemExternalIdAttributeName}="(.+)"`, "gi");
const itemLinkExternalIdRegex = new RegExp(`${itemLinkExternalIdAttributeName}="(.+)"`, "gi");
const assetExternalIdRegex = new RegExp(`${assetExternalIdAttributeName}="(.+)"`, "gi");
