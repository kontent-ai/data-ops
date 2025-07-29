import {
  type AssetContracts,
  type AssetFolderContracts,
  type CollectionContracts,
  type ContentItemContracts,
  type ContentTypeContracts,
  type ContentTypeSnippetContracts,
  type LanguageContracts,
  type LanguageVariantContracts,
  ManagementClient,
  type PreviewContracts,
  type RoleContracts,
  type SpaceContracts,
  type TaxonomyContracts,
  type WebhookContracts,
  type WebSpotlightContracts,
  type WorkflowContracts,
} from "@kontent-ai/management-sdk";
import { config as dotenvConfig } from "dotenv";
import StreamZip, { type StreamZipAsync } from "node-stream-zip";

import { serially } from "../../../../src/utils/requests.ts";
import type { FilterParam } from "./compare.ts";

dotenvConfig();

const { API_KEY } = process.env;

if (!API_KEY) {
  throw new Error("API_KEY is missing in environment variables.");
}

export type AllEnvData = Readonly<{
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
  variants: ReadonlyArray<LanguageVariantContracts.ILanguageVariantModelContract>;
  webhooks: ReadonlyArray<WebhookContracts.IWebhookContract>;
  webSpotlight: WebSpotlightContracts.IWebSpotlightStatus;
}>;

export const loadVariantsByItemCodename = async (
  envId: string,
  itemCodenames: ReadonlyArray<string>,
  langId: string,
): Promise<AllEnvData> => {
  const client = new ManagementClient({
    apiKey: API_KEY,
    environmentId: envId,
  });

  const variants = (
    await Promise.all(
      itemCodenames.map(async (codename) =>
        client
          .listLanguageVariantsOfItem()
          .byItemCodename(codename)
          .toPromise()
          .then((r) => r.data.items.map((i) => i._raw).filter((i) => i.language.id === langId)),
      ),
    )
  ).flat();

  return { ...emptyAllEnvData, variants };
};

export const loadAllEnvData = (envId: string, filterParam: FilterParam = { exclude: [] }) => {
  const client = new ManagementClient({
    apiKey: API_KEY,
    environmentId: envId,
  });

  return loadData(client, filterParam);
};

const loadData = async (
  client: ManagementClient,
  filterParam: FilterParam,
): Promise<AllEnvData> => {
  const has = (e: keyof AllEnvData) =>
    "exclude" in filterParam ? !filterParam.exclude.includes(e) : filterParam.include.includes(e);

  return {
    collections: has("collections")
      ? await client
          .listCollections()
          .toPromise()
          .then((res) => res.rawData.collections)
      : [],
    spaces: has("spaces")
      ? await client
          .listSpaces()
          .toPromise()
          .then((res) => res.rawData)
      : [],
    languages: has("languages")
      ? await client
          .listLanguages()
          .toAllPromise()
          .then((res) => res.data.items.map((l) => l._raw))
      : [],
    previewUrls: has("previewUrls")
      ? await client
          .getPreviewConfiguration()
          .toPromise()
          .then((res) => res.rawData)
      : { space_domains: [], preview_url_patterns: [] },
    taxonomies: has("taxonomies")
      ? await client
          .listTaxonomies()
          .toAllPromise()
          .then((res) => res.data.items.map((t) => t._raw))
      : [],
    assetFolders: has("assetFolders")
      ? await client
          .listAssetFolders()
          .toPromise()
          .then((res) => res.rawData.folders)
      : [],
    assets: has("assets")
      ? await client
          .listAssets()
          .toAllPromise()
          .then((res) => res.data.items.map((a) => a._raw))
      : [],
    roles: has("roles")
      ? await client
          .listRoles()
          .toPromise()
          .then((res) => res.rawData.roles)
      : [],
    workflows: has("workflows")
      ? await client
          .listWorkflows()
          .toPromise()
          .then((res) => res.rawData)
      : [],
    snippets: has("snippets")
      ? await client
          .listContentTypeSnippets()
          .toAllPromise()
          .then((res) => res.data.items.map((s) => s._raw))
      : [],
    types: has("types")
      ? await client
          .listContentTypes()
          .toAllPromise()
          .then((res) => res.data.items.map((t) => t._raw))
      : [],
    items: has("items")
      ? await client
          .listContentItems()
          .toAllPromise()
          .then((res) => res.data.items.map((i) => i._raw))
      : [],
    variants: has("variants")
      ? (
          await serially(
            (
              await client
                .listCollections()
                .toPromise()
                .then((res) => res.rawData.collections)
            ).map(
              (collection) => async () =>
                await client
                  .listLanguageVariantsByCollection()
                  .byCollectionId(collection.id)
                  .toAllPromise()
                  .then((res) => res.data.items.map((v) => v._raw)),
            ),
          )
        ).flat()
      : [],
    webhooks: has("webhooks")
      ? await client
          .listWebhooks()
          .toPromise()
          .then((res) => res.data.webhooks.map((w) => w._raw))
      : [],
    webSpotlight: has("webSpotlight")
      ? (await client.checkWebSpotlightStatus().toPromise()).rawData
      : { enabled: false, root_type: null },
  };
};

export const loadAllEnvDataFromZip = async (fileName: string): Promise<AllEnvData> => {
  const zip = new StreamZip.async({ file: fileName });

  return {
    collections: await loadFile(zip, "collections.json"),
    spaces: await loadFile(zip, "spaces.json"),
    taxonomies: await loadFile(zip, "taxonomies.json"),
    languages: await loadFile(zip, "languages.json"),
    previewUrls: await loadFile(zip, "previewUrls.json"),
    roles: await loadFile(zip, "roles.json"),
    workflows: await loadFile(zip, "workflows.json"),
    snippets: await loadFile(zip, "contentTypeSnippets.json"),
    types: await loadFile(zip, "contentTypes.json"),
    items: await loadFile(zip, "contentItems.json"),
    variants: await loadFile(zip, "languageVariants.json"),
    assetFolders: await loadFile(zip, "assetFolders.json"),
    assets: await loadFile(zip, "assets.json"),
    webhooks: await loadFile(zip, "webhooks.json"),
    webSpotlight: await loadFile(zip, "webSpotlight.json"),
  };
};

const loadFile = (zip: StreamZipAsync, fileName: string) =>
  zip
    .entryData(fileName)
    .then((b) => b.toString("utf8"))
    .then(JSON.parse)
    .catch(() => undefined);

export const emptyAllEnvData: AllEnvData = {
  collections: [],
  spaces: [],
  languages: [],
  previewUrls: { space_domains: [], preview_url_patterns: [] },
  taxonomies: [],
  assetFolders: [],
  assets: [],
  roles: [],
  workflows: [],
  snippets: [],
  types: [],
  items: [],
  variants: [],
  webhooks: [],
  webSpotlight: { enabled: false, root_type: null },
};
