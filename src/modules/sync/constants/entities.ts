import type { SyncEntities } from "../syncRun.js";
import {
  assetFoldersFileName,
  collectionsFileName,
  contentTypeSnippetsFileName,
  contentTypesFileName,
  languagesFileName,
  livePreviewFileName,
  spacesFileName,
  taxonomiesFileName,
  workflowsFileName,
} from "./filename.js";

// "webSpotlight" remains a recognized choice as a deprecated alias for "livePreview".
// The CLI layer translates it before any downstream code sees it.
export const syncEntityChoices = [
  "contentTypes",
  "contentTypeSnippets",
  "taxonomies",
  "collections",
  "assetFolders",
  "spaces",
  "languages",
  "livePreview",
  "webSpotlight",
  "workflows",
] as const;

export type SyncEntityName = (typeof syncEntityChoices)[number];

export const legacyWebSpotlightAlias = "webSpotlight" satisfies SyncEntityName;

// includes transitive dependencies
export const syncEntityDependencies: Record<SyncEntityName, ReadonlyArray<keyof SyncEntities>> = {
  contentTypes: ["contentTypes", "contentTypeSnippets", "taxonomies"],
  contentTypeSnippets: ["contentTypeSnippets", "taxonomies", "contentTypes"],
  collections: ["collections"],
  taxonomies: ["taxonomies"],
  spaces: ["spaces", "collections"],
  workflows: ["workflows", "collections", "contentTypes", "contentTypeSnippets", "taxonomies"],
  assetFolders: ["assetFolders"],
  languages: ["languages"],
  livePreview: ["livePreview"],
  webSpotlight: ["livePreview"],
};

export const entityToFilename = {
  contentTypes: contentTypesFileName,
  contentTypeSnippets: contentTypeSnippetsFileName,
  taxonomies: taxonomiesFileName,
  collections: collectionsFileName,
  livePreview: livePreviewFileName,
  webSpotlight: livePreviewFileName,
  assetFolders: assetFoldersFileName,
  spaces: spacesFileName,
  languages: languagesFileName,
  workflows: workflowsFileName,
} as const satisfies Record<SyncEntityName, string>;
