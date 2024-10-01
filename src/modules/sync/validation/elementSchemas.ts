import { ContentTypeElements } from "@kontent-ai/management-sdk";
import { z } from "zod";

import { AddPropToObjectTuple, IsFullEnum, IsSubset, RequiredZodObject } from "../../../utils/types.js";
import {
  SyncSnippetAssetElement,
  SyncSnippetCustomElement,
  SyncSnippetDateTimeElement,
  SyncSnippetGuidelinesElement,
  SyncSnippetLinkedItemsElement,
  SyncSnippetMultipleChoiceElement,
  SyncSnippetNumberElement,
  SyncSnippetRichTextElement,
  SyncSnippetTaxonomyElement,
  SyncSnippetTextElement,
  SyncSubpagesElement,
  SyncTypeSnippetElement,
  SyncUrlSlugElement,
} from "../types/syncModel.js";
import { CodenameReferenceSchema } from "./commonSchemas.js";

export const AssetElementDataSchema = z.strictObject(
  {
    name: z.string(),
    codename: z.string(),
    type: z.literal("asset"),
    guidelines: z.string().optional(),
    asset_count_limit: z
      .strictObject({
        value: z.number(),
        condition: z.enum(["at_most", "exactly", "at_least"]),
      })
      .optional(),
    maximum_file_size: z.number().optional(),
    allowed_file_types: z.enum(["adjustable", "any"]).optional(),
    image_width_limit: z
      .strictObject({
        value: z.number(),
        condition: z.enum(["at_most", "exactly", "at_least"]),
      })
      .optional(),
    image_height_limit: z
      .strictObject({
        value: z.number(),
        condition: z.enum(["at_most", "exactly", "at_least"]),
      })
      .optional(),
    is_required: z.boolean().optional(),
    is_non_localizable: z.boolean().optional(),
    default: z
      .strictObject({
        global: z.strictObject({
          value: z.array(CodenameReferenceSchema.extend({ external_id: z.string() })),
        }),
      })
      .optional(),
  } satisfies RequiredZodObject<SyncSnippetAssetElement>,
);

export const CustomElementDataSchema = z.strictObject(
  {
    name: z.string(),
    codename: z.string(),
    type: z.literal("custom"),
    source_url: z.string(),
    json_parameters: z.string().optional(),
    guidelines: z.string().optional(),
    is_required: z.boolean().optional(),
    is_non_localizable: z.boolean().optional(),
    allowed_elements: z.array(CodenameReferenceSchema).optional(),
  } satisfies RequiredZodObject<SyncSnippetCustomElement>,
);

export const DateTimeElementDataSchema = z.strictObject(
  {
    name: z.string(),
    codename: z.string(),
    type: z.literal("date_time"),
    is_required: z.boolean().optional(),
    is_non_localizable: z.boolean().optional(),
    guidelines: z.string().optional(),
    default: z
      .strictObject({
        global: z.strictObject({
          value: z.string(),
        }),
      })
      .optional(),
  } satisfies RequiredZodObject<SyncSnippetDateTimeElement>,
);

export const GuidelinesElementDataSchema = z.strictObject(
  {
    codename: z.string(),
    guidelines: z.string(),
    type: z.literal("guidelines"),
  } satisfies RequiredZodObject<SyncSnippetGuidelinesElement>,
);

export const LinkedItemsElementDataSchema = z.strictObject(
  {
    name: z.string(),
    codename: z.string(),
    item_count_limit: z
      .strictObject({
        value: z.number(),
        condition: z.enum(["at_most", "exactly", "at_least"]),
      })
      .optional(),
    allowed_content_types: z.array(CodenameReferenceSchema).optional(),
    guidelines: z.string().optional(),
    type: z.literal("modular_content"),
    is_required: z.boolean().optional(),
    is_non_localizable: z.boolean().optional(),
    default: z.strictObject({
      global: z.strictObject({ value: z.array(CodenameReferenceSchema.extend({ external_id: z.string() })) }),
    }).optional(),
  } satisfies RequiredZodObject<SyncSnippetLinkedItemsElement>,
);

const MultipleChoiceOptionSchema = z.strictObject({
  name: z.string(),
  codename: z.string(),
});

export const MultipleChoiceElementDataSchema = z.strictObject(
  {
    mode: z.enum(["single", "multiple"]),
    options: z.array(MultipleChoiceOptionSchema),
    codename: z.string(),
    name: z.string(),
    type: z.literal("multiple_choice"),
    is_required: z.boolean().optional(),
    is_non_localizable: z.boolean().optional(),
    guidelines: z.string().optional(),
    default: z.strictObject({
      global: z.strictObject({
        value: z.array(CodenameReferenceSchema),
      }),
    }).optional(),
  } satisfies RequiredZodObject<SyncSnippetMultipleChoiceElement>,
);

export const NumberElementDataSchema = z.strictObject(
  {
    name: z.string(),
    codename: z.string(),
    type: z.literal("number"),
    is_required: z.boolean().optional(),
    is_non_localizable: z.boolean().optional(),
    guidelines: z.string().optional(),
    default: z
      .strictObject({
        global: z.strictObject({
          value: z.number(),
        }),
      })
      .optional(),
  } satisfies RequiredZodObject<SyncSnippetNumberElement>,
);

const RichTextImageConditionTuple = ["at_most", "exactly", "at_least"] as const;
const RichTextAllowedTextBlock = [
  "paragraph",
  "heading-one",
  "heading-two",
  "heading-three",
  "heading-four",
  "heading-five",
  "heading-six",
  "ordered-list",
  "unordered-list",
] as const;

const RichTextAllowedFormatting = [
  "unstyled",
  "bold",
  "italic",
  "code",
  "link",
  "subscript",
  "superscript",
] as const;

const RichTextImageConditionSchema = z.enum(
  RichTextImageConditionTuple satisfies IsFullEnum<
    IsSubset<typeof RichTextImageConditionTuple[number], ContentTypeElements.RichTextImageCondition>,
    IsSubset<ContentTypeElements.RichTextImageCondition, typeof RichTextImageConditionTuple[number]>,
    IsSubset<ContentTypeElements.RichTextImageCondition, typeof RichTextImageConditionTuple[number]>
  >,
);

const RichTextAllowedTextBlockSchema = z.enum(
  RichTextAllowedTextBlock satisfies IsFullEnum<
    IsSubset<typeof RichTextAllowedTextBlock[number], ContentTypeElements.RichTextAllowedTextBlock>,
    IsSubset<ContentTypeElements.RichTextAllowedTextBlock, typeof RichTextAllowedTextBlock[number]>,
    IsSubset<ContentTypeElements.RichTextAllowedTextBlock, typeof RichTextAllowedTextBlock[number]>
  >,
);

const RichTextAllowedFormattingSchema = z.enum(
  RichTextAllowedFormatting satisfies IsFullEnum<
    IsSubset<typeof RichTextAllowedFormatting[number], ContentTypeElements.RichTextAllowedFormatting>,
    IsSubset<ContentTypeElements.RichTextAllowedFormatting, typeof RichTextAllowedFormatting[number]>,
    IsSubset<ContentTypeElements.RichTextAllowedFormatting, typeof RichTextAllowedFormatting[number]>
  >,
);

export const RichTextElementDataSchema = z.strictObject(
  {
    name: z.string(),
    codename: z.string(),
    type: z.literal("rich_text"),
    maximum_text_length: z
      .strictObject({ value: z.number(), applies_to: z.enum(["words", "characters"]) }).optional(),
    maximum_image_size: z.number().optional(),
    allowed_content_types: z.array(CodenameReferenceSchema).optional(),
    allowed_item_link_types: z.array(CodenameReferenceSchema).optional(),
    image_width_limit: z
      .strictObject({ value: z.number(), condition: RichTextImageConditionSchema })
      .optional(),
    image_height_limit: z
      .strictObject({ value: z.number(), condition: RichTextImageConditionSchema })
      .optional(),
    allowed_image_types: z.enum(["adjustable", "any"]).optional(),
    is_required: z.boolean().optional(),
    is_non_localizable: z.boolean().optional(),
    guidelines: z.string().optional(),
    allowed_blocks: z.array(z.enum(["images", "text", "tables", "components-and-items"])).optional(),
    allowed_text_blocks: z.array(RichTextAllowedTextBlockSchema).optional(),
    allowed_formatting: z.array(RichTextAllowedFormattingSchema).optional(),
    allowed_table_blocks: z.array(z.enum(["images", "text"])).optional(),
    allowed_table_text_blocks: z.array(RichTextAllowedTextBlockSchema).optional(),
    allowed_table_formatting: z.array(RichTextAllowedFormattingSchema).optional(),
  } satisfies RequiredZodObject<SyncSnippetRichTextElement>,
);

export const SubpagesElementDataSchema = z.strictObject(
  {
    name: z.string(),
    codename: z.string(),
    type: z.literal("subpages"),
    item_count_limit: z
      .strictObject({
        value: z.number(),
        condition: z.enum(["at_most", "exactly", "at_least"]),
      })
      .optional(),
    allowed_content_types: z.array(CodenameReferenceSchema).optional(),
    guidelines: z.string().optional(),
    is_required: z.boolean().optional(),
    is_non_localizable: z.boolean().optional(),
    default: z.strictObject({
      global: z.strictObject({ value: z.array(CodenameReferenceSchema.extend({ external_id: z.string() })) }),
    }).optional(),
  } satisfies RequiredZodObject<Omit<SyncSubpagesElement, "content_group">>,
);

export const SnippetElementDataSchema = z.strictObject(
  {
    codename: z.string(),
    type: z.literal("snippet"),
    snippet: CodenameReferenceSchema,
  } satisfies RequiredZodObject<Omit<SyncTypeSnippetElement, "content_group">>,
);

export const TaxonomyElementDataSchema = z.strictObject(
  {
    name: z.string(),
    codename: z.string(),
    type: z.literal("taxonomy"),
    taxonomy_group: CodenameReferenceSchema,
    guidelines: z.string().optional(),
    is_required: z.boolean().optional(),
    is_non_localizable: z.boolean().optional(),
    term_count_limit: z
      .strictObject({
        value: z.number(),
        condition: z.enum(["at_most", "exactly", "at_least"]),
      })
      .optional(),
    default: z
      .strictObject({
        global: z.strictObject({
          value: z.array(CodenameReferenceSchema),
        }),
      })
      .optional(),
  } satisfies RequiredZodObject<SyncSnippetTaxonomyElement>,
);

export const TextElementDataSchema = z.strictObject(
  {
    name: z.string(),
    codename: z.string(),
    type: z.literal("text"),
    is_required: z.boolean().optional(),
    is_non_localizable: z.boolean().optional(),
    guidelines: z.string().optional(),
    maximum_text_length: z
      .strictObject({ value: z.number(), applies_to: z.enum(["words", "characters"]) })
      .optional(),
    default: z.strictObject({ global: z.strictObject({ value: z.string() }) }).optional(),
    validation_regex: z
      .strictObject({
        is_active: z.boolean(),
        regex: z.string(),
        flags: z.string().nullable().optional(),
        validation_message: z.string().optional(),
      }).optional(),
  } satisfies RequiredZodObject<SyncSnippetTextElement>,
);

export const UrlSlugElementDataSchema = z.strictObject(
  {
    name: z.string(),
    codename: z.string(),
    type: z.literal("url_slug"),
    depends_on: z.strictObject({
      element: CodenameReferenceSchema,
      snippet: CodenameReferenceSchema.optional(),
    }),
    is_required: z.boolean().optional(),
    is_non_localizable: z.boolean().optional(),
    guidelines: z.string().optional(),
    validation_regex: z
      .strictObject({
        is_active: z.boolean(),
        regex: z.string(),
        flags: z.string().optional(),
        validation_message: z.string().optional(),
      })
      .optional(),
  } satisfies RequiredZodObject<Omit<SyncUrlSlugElement, "content_group">>,
);

export const SnippetElementsSchemas = [
  AssetElementDataSchema,
  CustomElementDataSchema,
  DateTimeElementDataSchema,
  GuidelinesElementDataSchema,
  LinkedItemsElementDataSchema,
  NumberElementDataSchema,
  MultipleChoiceElementDataSchema,
  RichTextElementDataSchema,
  TaxonomyElementDataSchema,
  TextElementDataSchema,
] as const;

const TypeElementSchemas = [
  ...SnippetElementsSchemas,
  SnippetElementDataSchema,
  SubpagesElementDataSchema,
  UrlSlugElementDataSchema,
] as const;

const ContentGroupSchema = z.strictObject({
  content_group: CodenameReferenceSchema,
});

export const TypeElementSchemasWithGroups = TypeElementSchemas
  .map(schema => schema.merge(ContentGroupSchema)) as unknown as AddPropToObjectTuple<
    typeof TypeElementSchemas,
    typeof ContentGroupSchema
  >;

export const SnippetElementsSchemasUnion = z.discriminatedUnion("type", [...SnippetElementsSchemas]);
export const TypeElementsSchemasUnion = z.discriminatedUnion("type", [...TypeElementSchemas]);
export const TypeElementWithGroupSchemasUnion = z.discriminatedUnion("type", [...TypeElementSchemasWithGroups]);
