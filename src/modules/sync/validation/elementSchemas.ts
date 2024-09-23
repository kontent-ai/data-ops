import { z } from "zod";

import { AddPropToObjectTuple, CombineTuples } from "../../../utils/types.js";
import {
  SyncAssetElement,
  SyncCustomElement,
  SyncDateTimeElement,
  SyncGuidelinesElement,
  SyncLinkedItemsElement,
  SyncMultipleChoiceElement,
  SyncNumberElement,
  SyncRichTextElement,
  SyncSubpagesElement,
  SyncTaxonomyElement,
  SyncTextElement,
  SyncTypeSnippetElement,
  SyncUrlSlugElement,
} from "../types/syncModel.js";
import { CodenameReferenceSchema } from "./commonSchemas.js";

export const AssetElementDataSchema = z.strictObject({
  name: z.string(),
  codename: z.string(),
  type: z.literal("asset"),
  guidelines: z.string().optional(),
  asset_count_limit: z
    .strictObject({
      value: z.number(),
      condition: z.union([z.literal("at_most"), z.literal("exactly"), z.literal("at_least")]),
    })
    .optional(),
  maximum_file_size: z.number().optional(),
  allowed_file_types: z.union([z.literal("adjustable"), z.literal("any")]).optional(),
  image_width_limit: z
    .strictObject({
      value: z.number(),
      condition: z.union([z.literal("at_most"), z.literal("exactly"), z.literal("at_least")]),
    })
    .optional(),
  image_height_limit: z
    .strictObject({
      value: z.number(),
      condition: z.union([z.literal("at_most"), z.literal("exactly"), z.literal("at_least")]),
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
}) satisfies z.ZodType<SyncAssetElement>;

export const CustomElementDataSchema = z.strictObject({
  name: z.string(),
  codename: z.string(),
  type: z.literal("custom"),
  source_url: z.string(),
  json_parameters: z.string().optional(),
  guidelines: z.string().optional(),
  is_required: z.boolean().optional(),
  is_non_localizable: z.boolean().optional(),
  allowed_elements: z.array(CodenameReferenceSchema).optional(),
}) satisfies z.ZodType<SyncCustomElement>;

export const DateTimeElementDataSchema = z.strictObject({
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
}) satisfies z.ZodType<SyncDateTimeElement>;

export const GuidelinesElementDataSchema = z.strictObject({
  codename: z.string(),
  guidelines: z.string(),
  type: z.literal("guidelines"),
}) satisfies z.ZodType<SyncGuidelinesElement>;

export const LinkedItemsElementDataSchema = z.strictObject({
  name: z.string(),
  codename: z.string(),
  item_count_limit: z
    .strictObject({
      value: z.number(),
      condition: z.union([z.literal("at_most"), z.literal("exactly"), z.literal("at_least")]),
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
}) satisfies z.ZodType<SyncLinkedItemsElement>;

const MultipleChoiceOptionSchema = z.strictObject({
  name: z.string(),
  codename: z.string(),
});

export const MultipleChoiceElementDataSchema = z.strictObject({
  mode: z.union([z.literal("single"), z.literal("multiple")]),
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
}) satisfies z.ZodType<SyncMultipleChoiceElement>;

export const NumberElementDataSchema = z.strictObject({
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
}) satisfies z.ZodType<SyncNumberElement>;

const RichTextAllowedBlockSchema = z.enum(["images", "text", "tables", "components-and-items"]);
const RichTextAllowedTableBlockSchema = z.enum(["images", "text"]);
const RichTextImageConditionSchema = z.enum(["at_most", "exactly", "at_least"]);
const RichTextAllowedImageTypeSchema = z.enum(["adjustable", "any"]);
const RichTextMaximumLengthAppliesToSchema = z.enum(["words", "characters"]);
const RichTextAllowedTextBlockSchema = z.enum([
  "paragraph",
  "heading-one",
  "heading-two",
  "heading-three",
  "heading-four",
  "heading-five",
  "heading-six",
  "ordered-list",
  "unordered-list",
]);
const RichTextAllowedFormattingSchema = z.enum([
  "unstyled",
  "bold",
  "italic",
  "code",
  "link",
  "subscript",
  "superscript",
]);

export const RichTextElementDataSchema = z.strictObject({
  name: z.string(),
  codename: z.string(),
  type: z.literal("rich_text"),
  maximum_text_length: z
    .strictObject({ value: z.number(), applies_to: RichTextMaximumLengthAppliesToSchema }).optional(),
  maximum_image_size: z.number().optional(),
  allowed_content_types: z.array(CodenameReferenceSchema).optional(),
  allowed_item_link_types: z.array(CodenameReferenceSchema).optional(),
  image_width_limit: z
    .strictObject({ value: z.number(), condition: RichTextImageConditionSchema })
    .optional(),
  image_height_limit: z
    .strictObject({ value: z.number(), condition: RichTextImageConditionSchema })
    .optional(),
  allowed_image_types: RichTextAllowedImageTypeSchema.optional(),
  is_required: z.boolean().optional(),
  is_non_localizable: z.boolean().optional(),
  guidelines: z.string().optional(),
  allowed_blocks: z.array(RichTextAllowedBlockSchema).optional(),
  allowed_text_blocks: z.array(RichTextAllowedTextBlockSchema).optional(),
  allowed_formatting: z.array(RichTextAllowedFormattingSchema).optional(),
  allowed_table_blocks: z.array(RichTextAllowedTableBlockSchema).optional(),
  allowed_table_text_blocks: z.array(RichTextAllowedTextBlockSchema).optional(),
  allowed_table_formatting: z.array(RichTextAllowedFormattingSchema).optional(),
}) satisfies z.ZodType<SyncRichTextElement>;

export const SubpagesElementDataSchema = z.strictObject({
  name: z.string(),
  codename: z.string(),
  type: z.literal("subpages"),
  item_count_limit: z
    .strictObject({
      value: z.number(),
      condition: z.union([z.literal("at_most"), z.literal("exactly"), z.literal("at_least")]),
    })
    .optional(),
  allowed_content_types: z.array(CodenameReferenceSchema).optional(),
  guidelines: z.string().optional(),
  is_required: z.boolean().optional(),
  is_non_localizable: z.boolean().optional(),
}) satisfies z.ZodType<SyncSubpagesElement>;

export const SnippetElementDataSchema = z.strictObject({
  codename: z.string(),
  type: z.literal("snippet"),
  snippet: CodenameReferenceSchema,
}) satisfies z.ZodType<SyncTypeSnippetElement>;

export const TaxonomyElementDataSchema = z.strictObject({
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
      condition: z.union([z.literal("at_most"), z.literal("exactly"), z.literal("at_least")]),
    })
    .optional(),
  default: z
    .strictObject({
      global: z.strictObject({
        value: z.array(CodenameReferenceSchema),
      }),
    })
    .optional(),
}) satisfies z.ZodType<SyncTaxonomyElement>;

export const TextElementDataSchema = z.strictObject({
  name: z.string(),
  codename: z.string(),
  type: z.literal("text"),
  is_required: z.boolean().optional(),
  is_non_localizable: z.boolean().optional(),
  guidelines: z.string().optional(),
  maximum_text_length: z
    .strictObject({ value: z.number(), applies_to: z.union([z.literal("words"), z.literal("characters")]) })
    .optional(),
  default: z.strictObject({ global: z.strictObject({ value: z.string() }) }).optional(),
  validation_regex: z
    .strictObject({
      is_active: z.boolean(),
      regex: z.string(),
      flags: z.string().nullable().optional(),
      validation_message: z.string().optional(),
    }).optional(),
}) satisfies z.ZodType<SyncTextElement>;

export const UrlSlugElementDataSchema = z.strictObject({
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
}) satisfies z.ZodType<SyncUrlSlugElement>;

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

const extendTuples = <Tuple1 extends ReadonlyArray<unknown>, Tuple2 extends ReadonlyArray<unknown>>(
  t1: Tuple1,
  t2: Tuple2,
): CombineTuples<Tuple1, Tuple2> => [...t1, ...t2] as unknown as CombineTuples<Tuple1, Tuple2>;

const TypeElementSchemas = extendTuples(
  SnippetElementsSchemas,
  [SnippetElementDataSchema, SubpagesElementDataSchema, UrlSlugElementDataSchema] as const,
);

export const TypeElementSchemasWithGroups = TypeElementSchemas
  .map(schema =>
    schema.extend({ content_group: z.strictObject({ codename: z.string() }) })
  ) as unknown as AddPropToObjectTuple<
    typeof TypeElementSchemas,
    typeof ContentGroupSchema
  >;

const ContentGroupSchema = z.strictObject({
  content_group: z.strictObject({ codename: z.string() }),
});

export const SnippetElementsSchemasUnion = z.discriminatedUnion("type", [...SnippetElementsSchemas]);
export const TypeElementsSchemasUnion = z.discriminatedUnion("type", [...TypeElementSchemas]);
export const TypeElementWithGroupSchemasUnion = z.discriminatedUnion("type", [...TypeElementSchemasWithGroups]);
