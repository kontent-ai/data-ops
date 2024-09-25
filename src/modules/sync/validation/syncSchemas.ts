import { z } from "zod";

import {
  AssetFolderSchema,
  CollectionSchema,
  LanguageSchema,
  SnippetSchema,
  SpaceSchema,
  TaxonomySchema,
  TypeSchema,
  WebSpotlightSchema,
  WorkflowSchema,
} from "./entitySchema.js";

export const SyncTypesSchema = z.array(TypeSchema);
export const SyncSnippetsSchema = z.array(SnippetSchema);
export const SyncTaxonomySchema = z.array(TaxonomySchema);
export const SyncCollectionsSchema = z.array(CollectionSchema);
export const SyncLanguageSchema = z.array(LanguageSchema);
export const SyncAssetFolderSchema = z.array(AssetFolderSchema);
export const SyncSpacesSchema = z.array(SpaceSchema);
export const SyncWebSpotlightSchema = WebSpotlightSchema;
export const SyncWorkflowSchema = z.array(WorkflowSchema);
