import { expect } from "@jest/globals";
import { ManagementClient } from "@kontent-ai/management-sdk";

const { API_KEY } = process.env;

if (!API_KEY) {
  throw new Error("API_KEY is missing in environment variables.");
}

export const expectNoPreviewUrls = async (envId: string) => {
  const client = makeClientFor(envId);

  const previewUrls = await client
    .getPreviewConfiguration()
    .toPromise()
    .then(res => res.data);

  previewUrls.spaceDomains.forEach(d => expect(d.domain).toBe(""));
  expect(previewUrls.previewUrlPatterns).toStrictEqual([]);
};

export const expectNoTaxonomies = async (envId: string) => {
  const client = makeClientFor(envId);

  const taxonomies = await client
    .listTaxonomies()
    .toAllPromise()
    .then(res => res.data.items);

  expect(taxonomies).toStrictEqual([]);
};

export const expectNoAssetFolders = async (envId: string) => {
  const client = makeClientFor(envId);

  const folders = await client
    .listAssetFolders()
    .toPromise()
    .then(res => res.data.items);

  expect(folders).toStrictEqual([]);
};

export const expectNoAssets = async (envId: string) => {
  const client = makeClientFor(envId);

  const assets = await client
    .listAssets()
    .toAllPromise()
    .then(res => res.data.items);

  expect(assets).toStrictEqual([]);
};

export const expectNoWorkflows = async (envId: string) => {
  const client = makeClientFor(envId);

  const [defaultWorkflow, ...restWorkflows] = await client
    .listWorkflows()
    .toPromise()
    .then(res => res.data);

  expect(restWorkflows).toStrictEqual([]);
  expect(defaultWorkflow?.name).toBe("Default");
  expect(defaultWorkflow?.codename).toBe("default");
  expect(defaultWorkflow?.scopes).toStrictEqual([]);
  expect(defaultWorkflow?.steps.map(s => s.codename)).toStrictEqual(["draft"]);
};

export const expectNoSnippets = async (envId: string) => {
  const client = makeClientFor(envId);

  const assets = await client
    .listContentTypeSnippets()
    .toAllPromise()
    .then(res => res.data.items);

  expect(assets).toStrictEqual([]);
};

export const expectNoSpaces = async (envId: string) => {
  const client = makeClientFor(envId);

  const spaces = await client
    .listSpaces()
    .toPromise()
    .then(res => res.data);

  expect(spaces).toStrictEqual([]);
};

export const expectNoTypes = async (envId: string) => {
  const client = makeClientFor(envId);

  const types = await client
    .listContentTypes()
    .toAllPromise()
    .then(res => res.data.items);

  expect(types).toStrictEqual([]);
};

export const expectNoItems = async (envId: string) => {
  const client = makeClientFor(envId);

  const items = await client
    .listContentItems()
    .toAllPromise()
    .then(res => res.data.items);

  expect(items).toStrictEqual([]);
};

export const expectNoWebhooks = async (envId: string) => {
  const client = makeClientFor(envId);

  const webhooks = await client
    .listWebhooks()
    .toPromise()
    .then(res => res.data.webhooks);

  expect(webhooks).toStrictEqual([]);
};

const makeClientFor = (envId: string) =>
  new ManagementClient({
    apiKey: API_KEY,
    environmentId: envId,
  });
