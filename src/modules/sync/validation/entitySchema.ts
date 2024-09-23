import { ContentTypeContracts } from "@kontent-ai/management-sdk";
import { z } from "zod";

import { omit } from "../../../utils/object.js";
import { Replace } from "../../../utils/types.js";
import {
  AssetFolderSyncModel,
  CollectionSyncModel,
  ContentTypeSnippetsSyncModel,
  ContentTypeSyncModel,
  LanguageSyncModel,
  SpaceSyncModel,
  TaxonomySyncModel,
  WebSpotlightSyncModel,
} from "../types/syncModel.js";
import { CodenameReferenceSchema } from "./commonSchemas.js";
import {
  SnippetElementsSchemasUnion,
  TypeElementsSchemasUnion,
  TypeElementWithGroupSchemasUnion,
} from "./elementSchemas.js";

export const AssetFolderSchema: z.ZodType<AssetFolderSyncModel> = z.strictObject({
  name: z.string(),
  folders: z.lazy(() => AssetFolderSchema.array()),
  codename: z.string(),
});

export const TaxonomySchema: z.ZodType<TaxonomySyncModel> = z.strictObject({
  name: z.string(),
  codename: z.string(),
  terms: z.lazy(() => TaxonomySchema.array()),
});

export const SnippetSchema: z.ZodType<ContentTypeSnippetsSyncModel> = z.strictObject({
  name: z.string(),
  codename: z.string(),
  elements: z.array(SnippetElementsSchemasUnion),
});

const ContentGroupSchema = z.strictObject({ codename: z.string(), name: z.string() });

export const TypeSchema: z.ZodType<
  ContentTypeSyncModel,
  z.ZodTypeDef,
  { content_groups: ReadonlyArray<Replace<ContentTypeContracts.IContentTypeGroup, { codename: string }>> }
> = z
  .strictObject({ content_groups: z.array(ContentGroupSchema) })
  .passthrough()
  .transform(obj => ({ ...obj, groups_number: obj.content_groups.length === 0 ? "zero" : "multiple" }))
  .pipe(
    z.discriminatedUnion("groups_number", [
      z.strictObject({
        name: z.string(),
        codename: z.string(),
        groups_number: z.literal("zero"),
        content_groups: z.array(ContentGroupSchema).length(0),
        elements: z.array(TypeElementsSchemasUnion),
      }),
      z.strictObject({
        name: z.string(),
        codename: z.string(),
        groups_number: z.literal("multiple"),
        content_groups: z.array(ContentGroupSchema).min(1),
        elements: z.array(TypeElementWithGroupSchemasUnion),
      }),
    ])
      .refine(a =>
        a.groups_number === "zero"
          ? true
          : a.elements.every(e => a.content_groups.map(c => c.codename).includes(e.content_group.codename)), {
        message: "Content group codename must be one of the type's content group codename",
      }),
  )
  .transform(obj => omit(obj, ["groups_number"]));

export const WebSpotlightSchema: z.ZodType<WebSpotlightSyncModel> = z.strictObject({
  enabled: z.boolean(),
  root_type: CodenameReferenceSchema.nullable(),
});

export const CollectionSchema: z.ZodType<CollectionSyncModel> = z.strictObject({
  name: z.string(),
  codename: z.string(),
});

export const SpaceSchema: z.ZodType<SpaceSyncModel> = z.strictObject({
  name: z.string(),
  codename: z.string(),
  web_spotlight_root_item: CodenameReferenceSchema.optional(),
  collections: z.array(CodenameReferenceSchema),
});

export const LanguageSchema: z.ZodType<LanguageSyncModel> = z.discriminatedUnion("is_default", [
  z.strictObject(
    {
      name: z.string(),
      codename: z.string(),
      is_active: z.boolean(),
      is_default: z.literal(true),
    },
  ),
  z.strictObject(
    {
      name: z.string(),
      codename: z.string(),
      is_active: z.boolean(),
      is_default: z.literal(false),
      fallback_language: CodenameReferenceSchema,
    },
  ),
]);
