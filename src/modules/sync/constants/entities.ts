import type { SyncEntities } from "../syncRun.js";
import {
  assetFoldersFileName,
  collectionsFileName,
  contentTypeSnippetsFileName,
  contentTypesFileName,
  languagesFileName,
  spacesFileName,
  taxonomiesFileName,
  webSpotlightFileName,
  workflowsFileName,
} from "./filename.js";

export const syncEntityChoices = [
  "contentTypes",
  "contentTypeSnippets",
  "taxonomies",
  "collections",
  "assetFolders",
  "spaces",
  "languages",
  "webSpotlight",
  "workflows",
] as const;

export type SyncEntityName = (typeof syncEntityChoices)[number];

// includes transitive dependencies
export const syncEntityDependencies: Record<
  keyof SyncEntities,
  ReadonlyArray<keyof SyncEntities>
> = {
  contentTypes: ["contentTypes", "contentTypeSnippets", "taxonomies"],
  contentTypeSnippets: ["contentTypeSnippets", "taxonomies", "contentTypes"],
  collections: ["collections"],
  taxonomies: ["taxonomies"],
  spaces: ["spaces", "collections"],
  workflows: ["workflows", "collections", "contentTypes", "contentTypeSnippets", "taxonomies"],
  assetFolders: ["assetFolders"],
  languages: ["languages"],
  webSpotlight: ["webSpotlight", "contentTypes", "contentTypeSnippets", "taxonomies"],
};

export const entityToFilename = {
  contentTypes: contentTypesFileName,
  contentTypeSnippets: contentTypeSnippetsFileName,
  taxonomies: taxonomiesFileName,
  collections: collectionsFileName,
  webSpotlight: webSpotlightFileName,
  assetFolders: assetFoldersFileName,
  spaces: spacesFileName,
  languages: languagesFileName,
  workflows: workflowsFileName,
} as const satisfies Record<SyncEntityName, string>;
