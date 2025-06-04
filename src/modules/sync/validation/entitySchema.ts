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
  SpaceSyncModel,
  TaxonomySyncModel,
  WebSpotlightSyncModel,
  WorkflowSyncModel,
} from "../types/syncModel.js";
import { CodenameReferenceSchema } from "./commonSchemas.js";
import {
  SnippetElementsSchemasUnion,
  TypeElementWithGroupSchemasUnion,
  TypeElementsSchemasUnion,
} from "./elementSchemas.js";

export const AssetFolderSchema: z.ZodType<AssetFolderSyncModel> = z.strictObject({
  name: z.string(),
  folders: z.lazy(() => AssetFolderSchema.array()),
  codename: z.string(),
} satisfies RequiredZodObject<AssetFolderSyncModel>);

export const TaxonomySchema: z.ZodType<TaxonomySyncModel> = z.strictObject({
  name: z.string(),
  codename: z.string(),
  terms: z.lazy(() => TaxonomySchema.array()),
} satisfies RequiredZodObject<TaxonomySyncModel>);

export const SnippetSchema = z.strictObject({
  name: z.string(),
  codename: z.string(),
  elements: z.array(SnippetElementsSchemasUnion),
} satisfies RequiredZodObject<ContentTypeSnippetsSyncModel>);

const ContentGroupSchema = z.strictObject({ codename: z.string(), name: z.string() });

export const TypeSchema: z.ZodType<
  ContentTypeSyncModel,
  z.ZodTypeDef,
  Pick<ContentTypeSyncModel, "content_groups">
> = z
  .strictObject({ content_groups: z.array(ContentGroupSchema) })
  .passthrough()
  .transform((obj) => ({
    ...obj,
    groups_number: obj.content_groups.length === 0 ? "zero" : "multiple",
  }))
  .pipe(
    z
      .discriminatedUnion("groups_number", [
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

export const WebSpotlightSchema = z.strictObject({
  enabled: z.boolean(),
  root_type: CodenameReferenceSchema.nullable(),
} satisfies RequiredZodObject<WebSpotlightSyncModel>);

export const CollectionSchema = z.strictObject({
  name: z.string(),
  codename: z.string(),
} satisfies RequiredZodObject<CollectionSyncModel>);

export const SpaceSchema = z.strictObject({
  name: z.string(),
  codename: z.string(),
  web_spotlight_root_item: CodenameReferenceSchema.optional(),
  collections: z.array(CodenameReferenceSchema),
} satisfies RequiredZodObject<SpaceSyncModel>);

export const LanguageSchema = z.discriminatedUnion("is_default", [
  z.strictObject({
    name: z.string(),
    codename: z.string(),
    is_active: z.boolean(),
    is_default: z.literal(true),
  } satisfies RequiredZodObject<Omit<LanguageSyncModel, "fallback_language">>),
  z.strictObject({
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

const WorkflowPublishedStepSchema = z.strictObject({
  name: z.string(),
  codename: z.string(),
  create_new_version_role_ids: z.array(z.string()).length(0),
  unpublish_role_ids: z.array(z.string()).length(0),
} satisfies RequiredZodObject<Omit<WorkflowContracts.IWorkflowPublishedStepContract, "id">>);

const WorkflowArchivedStepSchema = z.strictObject({
  name: z.string(),
  codename: z.string(),
  role_ids: z.array(z.string()).length(0),
} satisfies RequiredZodObject<Omit<WorkflowContracts.IWorkflowArchivedStepContract, "id">>);

const WorkflowStepSchema = z.strictObject({
  name: z.string(),
  codename: z.string(),
  color: WorkflowColorSchema,
  transitions_to: z.array(z.strictObject({ step: CodenameReferenceSchema })),
  role_ids: z.array(z.string()).length(0),
} satisfies RequiredZodObject<Omit<WorkflowContracts.IWorkflowStepNewContract, "id">>);

export const WorkflowSchema = z.strictObject({
  name: z.string(),
  codename: z.string(),
  scopes: z.array(
    z.strictObject({
      content_types: z.array(CodenameReferenceSchema),
      collections: z.array(CodenameReferenceSchema),
    }),
  ),
  steps: z.array(WorkflowStepSchema),
  published_step: WorkflowPublishedStepSchema,
  archived_step: WorkflowArchivedStepSchema,
} satisfies RequiredZodObject<WorkflowSyncModel>);
