import type { NonEmptyReadonlyArray } from "../../../utils/types.js";
import {
  assetFoldersFileName,
  collectionsFileName,
  contentTypeSnippetsFileName,
  contentTypesFileName,
  languagesFileName,
  livePreviewFileName,
  spacesFileName,
  taxonomiesFileName,
  webSpotlightFileName,
  workflowsFileName,
} from "./filename.js";

export const syncEntities = [
  "contentTypes",
  "contentTypeSnippets",
  "taxonomies",
  "collections",
  "assetFolders",
  "spaces",
  "languages",
  "livePreview",
  "workflows",
] as const;

export const syncEntityChoices = [...syncEntities, "webSpotlight"] as const;

export type SyncEntityName = (typeof syncEntities)[number];
export type SyncEntityChoice = (typeof syncEntityChoices)[number];

export const legacyWebSpotlightAlias = "webSpotlight" satisfies SyncEntityChoice;

// includes transitive dependencies
export const syncEntityDependencies: Record<SyncEntityName, ReadonlyArray<SyncEntityName>> = {
  contentTypes: ["contentTypes", "contentTypeSnippets", "taxonomies"],
  contentTypeSnippets: ["contentTypeSnippets", "taxonomies", "contentTypes"],
  collections: ["collections"],
  taxonomies: ["taxonomies"],
  spaces: ["spaces", "collections"],
  workflows: ["workflows", "collections", "contentTypes", "contentTypeSnippets", "taxonomies"],
  assetFolders: ["assetFolders"],
  languages: ["languages"],
  livePreview: ["livePreview"],
};

export const entityToFilenames = {
  contentTypes: [contentTypesFileName],
  contentTypeSnippets: [contentTypeSnippetsFileName],
  taxonomies: [taxonomiesFileName],
  collections: [collectionsFileName],
  livePreview: [livePreviewFileName, webSpotlightFileName],
  assetFolders: [assetFoldersFileName],
  spaces: [spacesFileName],
  languages: [languagesFileName],
  workflows: [workflowsFileName],
} as const satisfies Record<SyncEntityName, NonEmptyReadonlyArray<string>>;
