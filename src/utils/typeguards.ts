import { ContentTypeModels, ContentTypeSnippetModels, SharedModels, TaxonomyModels } from "@kontent-ai/management-sdk";
import { z } from "zod";

import { spotlightInUseErrorCode } from "../constants/responseCodes.js";
import {
  CountLimitation,
  DefaultElementValue,
  DependsOn,
  ExternalIdReference,
  MaximumTextLength,
  ObjectReference,
  ValidationRegex,
} from "../modules/sync/types/patchOperation.js";

export const notNull = <T>(arg: T | null): arg is T => arg !== null;

export const notNullOrUndefined = <T>(arg: T | undefined | null): arg is T => arg !== undefined && arg !== null;

export const isSpotlightInUseError = (err: unknown): err is SharedModels.ContentManagementBaseKontentError =>
  z.object({
    errorCode: z.literal(spotlightInUseErrorCode),
  }).safeParse(err).success;

const elementTypesEnum = z.enum([
  "text",
  "rich_text",
  "number",
  "multiple_choice",
  "date_time",
  "asset",
  "modular_content",
  "taxonomy",
  "url_slug",
  "guidelines",
  "snippet",
  "custom",
  "subpages",
]);

const elementSchema: z.ZodType = z.object({
  type: elementTypesEnum,
});

const taxonomySchema: z.ZodType<TaxonomyModels.IAddTaxonomyRequestModel> = z.object({
  name: z.string(),
  terms: z.lazy(() => taxonomySchema.array()),
  codename: z.string().optional(),
  external_id: z.string().optional(),
});

const baseTypeSchema = z.object({
  name: z.string(),
  elements: elementSchema.array(),
  external_id: z.string().optional(),
  codename: z.string().optional(),
});

const snippetSchema: z.ZodType<ContentTypeSnippetModels.IAddContentTypeSnippetData> = baseTypeSchema;

const contentTypeSchema: z.ZodType<ContentTypeModels.IAddContentTypeData> = baseTypeSchema.extend({
  content_groups: z.object({
    name: z.string(),
    codename: z.string().optional(),
    external_id: z.string().optional(),
  }).array(),
});

const objectReferenceSchema: z.ZodType<ObjectReference> = z.object({
  codename: z.string(),
  id: z.string().optional(),
  external_id: z.string().optional(),
});

const externalIdReferenceSchema: z.ZodType<ExternalIdReference> = z.object({
  external_id: z.string(),
});

export const isAddTaxonomyData = (obj: unknown): obj is TaxonomyModels.IAddTaxonomyRequestModel =>
  taxonomySchema.safeParse(obj).success;

export const isAddContentTypeData = (obj: unknown): obj is ContentTypeModels.IAddContentTypeData =>
  contentTypeSchema.safeParse(obj).success;

export const isAddContentTypeSnippetData = (obj: unknown): obj is ContentTypeSnippetModels.IAddContentTypeSnippetData =>
  snippetSchema.safeParse(obj).success;

export const isCountLimitation = (obj: unknown): obj is CountLimitation =>
  z.object({
    value: z.number(),
    condition: z.enum(["at_most", "exactly", "at_least"]),
  }).safeParse(obj).success;

export const isObjectReference = (obj: unknown): obj is ObjectReference => objectReferenceSchema.safeParse(obj).success;

export const isObjectReferenceArray = (obj: unknown): obj is ObjectReference[] =>
  objectReferenceSchema.array().safeParse(obj).success;

export const isExternalIdReference = (obj: unknown): obj is ExternalIdReference =>
  externalIdReferenceSchema.safeParse(obj).success;

export const isExternalIdReferenceArray = (obj: unknown): obj is ExternalIdReference[] =>
  externalIdReferenceSchema.array().safeParse(obj).success;

export const isDependsOn = (obj: unknown): obj is DependsOn =>
  z.object({
    element: objectReferenceSchema,
    snippet: objectReferenceSchema.optional(),
  }).safeParse(obj).success;

export const isDefaultElementValue = (obj: unknown): obj is DefaultElementValue =>
  z.object({
    global: z.object({
      value: z.union([
        z.string(),
        z.number(),
        objectReferenceSchema,
        objectReferenceSchema.array(),
        externalIdReferenceSchema,
        externalIdReferenceSchema.array(),
      ]),
    }),
  }).safeParse(obj).success;

export const isMaximumTextLength = (obj: unknown): obj is MaximumTextLength =>
  z.object({
    value: z.number(),
    applies_to: z.enum(["words", "characters"]),
  }).safeParse(obj).success;

export const isValidationRegex = (obj: unknown): obj is ValidationRegex =>
  z.object({
    is_active: z.boolean(),
    regex: z.string(),
    flags: z.string().optional().nullable(),
    validation_message: z.string().optional(),
  }).safeParse(obj).success;
