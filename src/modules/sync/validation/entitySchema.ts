import type { WorkflowContracts } from "@kontent-ai/management-sdk";
import { z } from "zod";

import { omit } from "../../../utils/object.js";
import type { IsFullEnum, IsSubset, RequiredZodObject } from "../../../utils/types.js";
import type {
  AssetFolderSyncModel,
  CollectionSyncModel,
  ContentTypeSnippetsSyncModel,
  ContentTypeSyncModel,
  LanguageSyncModel,
  LivePreviewSyncModel,
  SpaceSyncModel,
  TaxonomySyncModel,
  WorkflowSyncModel,
} from "../types/syncModel.js";
import { CodenameReferenceSchema } from "./commonSchemas.js";
import {
  SnippetElementsSchemasUnion,
  TypeElementsSchemasUnion,
  TypeElementWithGroupSchemasUnion,
} from "./elementSchemas.js";

export const AssetFolderSchema: z.ZodType<AssetFolderSyncModel> = z.object({
  name: z.string(),
  folders: z.lazy(() => AssetFolderSchema.array()),
  codename: z.string(),
} satisfies RequiredZodObject<AssetFolderSyncModel>);

export const TaxonomySchema: z.ZodType<TaxonomySyncModel> = z.object({
  name: z.string(),
  codename: z.string(),
  terms: z.lazy(() => TaxonomySchema.array()),
} satisfies RequiredZodObject<TaxonomySyncModel>);

export const SnippetSchema = z.object({
  name: z.string(),
  codename: z.string(),
  elements: z.array(SnippetElementsSchemasUnion),
} satisfies RequiredZodObject<ContentTypeSnippetsSyncModel>);

const ContentGroupSchema = z.object({ codename: z.string(), name: z.string() });

export const TypeSchema: z.ZodType<
  ContentTypeSyncModel,
  z.ZodTypeDef,
  Pick<ContentTypeSyncModel, "content_groups">
> = z
  .object({ content_groups: z.array(ContentGroupSchema) })
  .passthrough()
  .transform((obj) => ({
    ...obj,
    groups_number: obj.content_groups.length === 0 ? "zero" : "multiple",
  }))
  .pipe(
    z
      .discriminatedUnion("groups_number", [
        z.object({
          name: z.string(),
          codename: z.string(),
          groups_number: z.literal("zero"),
          content_groups: z.array(ContentGroupSchema).length(0),
          elements: z.array(TypeElementsSchemasUnion),
        }),
        z.object({
          name: z.string(),
          codename: z.string(),
          groups_number: z.literal("multiple"),
          content_groups: z.array(ContentGroupSchema).min(1),
          elements: z.array(TypeElementWithGroupSchemasUnion),
        }),
      ])
      .refine(
        (a) =>
          a.groups_number === "zero"
            ? true
            : a.elements.every((e) =>
                a.content_groups.map((c) => c.codename).includes(e.content_group.codename),
              ),
        {
          message: "Content group codename must be one of the type's content group codename",
        },
      ),
  )
  .transform((obj) => omit(obj, ["groups_number"]));

export const LivePreviewSchema = z.object({
  status: z.string(),
} satisfies RequiredZodObject<LivePreviewSyncModel>);

// Legacy webSpotlight.json shape; root_type is dropped silently because the
// new live_preview endpoint has no global root concept (per-space root_item handles it).
export const LegacyWebSpotlightSchema: z.ZodType<LivePreviewSyncModel, z.ZodTypeDef, unknown> = z
  .object({
    enabled: z.boolean(),
    root_type: CodenameReferenceSchema.nullable(),
  })
  .transform(({ enabled }) => ({ status: enabled ? "enabled" : "disabled" }));

export const CollectionSchema = z.object({
  name: z.string(),
  codename: z.string(),
} satisfies RequiredZodObject<CollectionSyncModel>);

export const SpaceSchema: z.ZodType<SpaceSyncModel, z.ZodTypeDef, unknown> = z
  .object({
    name: z.string(),
    codename: z.string(),
    web_spotlight_root_item: CodenameReferenceSchema.optional(),
    root_item: CodenameReferenceSchema.optional(),
    collections: z.array(CodenameReferenceSchema),
  })
  .transform(({ web_spotlight_root_item, root_item, ...rest }) => ({
    ...rest,
    root_item: root_item ?? web_spotlight_root_item,
  }));

export const LanguageSchema = z.discriminatedUnion("is_default", [
  z.object({
    name: z.string(),
    codename: z.string(),
    is_active: z.boolean(),
    is_default: z.literal(true),
  } satisfies RequiredZodObject<Omit<LanguageSyncModel, "fallback_language">>),
  z.object({
    name: z.string(),
    codename: z.string(),
    is_active: z.boolean(),
    is_default: z.literal(false),
    fallback_language: CodenameReferenceSchema,
  } satisfies RequiredZodObject<LanguageSyncModel>),
]);

const colors = [
  "gray",
  "red",
  "rose",
  "light-purple",
  "dark-purple",
  "dark-blue",
  "light-blue",
  "sky-blue",
  "mint-green",
  "persian-green",
  "dark-green",
  "light-green",
  "yellow",
  "orange",
  "brown",
  "pink",
] as const;

const WorkflowColorSchema = z.enum(
  colors satisfies IsFullEnum<
    IsSubset<WorkflowContracts.WorkflowColor, (typeof colors)[number]>,
    IsSubset<(typeof colors)[number], WorkflowContracts.WorkflowColor>,
    IsSubset<(typeof colors)[number], WorkflowContracts.WorkflowColor>
  >,
);

const WorkflowPublishedStepSchema = z.object({
  name: z.string(),
  codename: z.string(),
  create_new_version_role_ids: z.array(z.string()).length(0),
  unpublish_role_ids: z.array(z.string()).length(0),
} satisfies RequiredZodObject<Omit<WorkflowContracts.IWorkflowPublishedStepContract, "id">>);

const WorkflowArchivedStepSchema = z.object({
  name: z.string(),
  codename: z.string(),
  role_ids: z.array(z.string()).length(0),
} satisfies RequiredZodObject<Omit<WorkflowContracts.IWorkflowArchivedStepContract, "id">>);

const WorkflowStepSchema = z.object({
  name: z.string(),
  codename: z.string(),
  color: WorkflowColorSchema,
  transitions_to: z.array(z.object({ step: CodenameReferenceSchema })),
  role_ids: z.array(z.string()).length(0),
} satisfies RequiredZodObject<Omit<WorkflowContracts.IWorkflowStepNewContract, "id">>);

export const WorkflowSchema = z.object({
  name: z.string(),
  codename: z.string(),
  scopes: z.array(
    z.object({
      content_types: z.array(CodenameReferenceSchema),
      collections: z.array(CodenameReferenceSchema),
    }),
  ),
  steps: z.array(WorkflowStepSchema),
  published_step: WorkflowPublishedStepSchema,
  archived_step: WorkflowArchivedStepSchema,
} satisfies RequiredZodObject<WorkflowSyncModel>);
