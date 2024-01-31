import {
  AssetContracts,
  AssetFolderContracts,
  CollectionContracts,
  ContentItemContracts,
  ContentTypeContracts,
  ContentTypeSnippetContracts,
  LanguageContracts,
  LanguageVariantContracts,
  ManagementClient,
  PreviewContracts,
  RoleContracts,
  SpaceContracts,
  TaxonomyContracts,
  WorkflowContracts,
} from "@kontent-ai/management-sdk";
import { config as dotenvConfig } from "dotenv";
import StreamZip, { StreamZipAsync } from "node-stream-zip";

import { serially } from "../../../../src/utils/requests";

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
}>;

export const loadAllEnvData = (envId: string) => {
  const client = new ManagementClient({
    apiKey: API_KEY,
    environmentId: envId,
  });

  return loadAllData(client);
};

const loadAllData = async (client: ManagementClient): Promise<AllEnvData> => ({
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
  variants: (await serially((await client.listCollections().toPromise().then(res => res.rawData.collections))
    .map(collection => async () =>
      await client
        .listLanguageVariantsByCollection()
        .byCollectionId(collection.id)
        .toAllPromise()
        .then(res => res.data.items.map(v => v._raw))
    )))
    .flat(),
});

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
  };
};

const loadFile = (zip: StreamZipAsync, fileName: string) =>
  zip.entryData(fileName)
    .then(b => b.toString("utf8"))
    .then(JSON.parse)
    .catch(() => undefined);
