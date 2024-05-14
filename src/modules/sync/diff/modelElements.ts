import { zip } from "../../../utils/array.js";
import { apply } from "../../../utils/function.js";
import { CodenameReference } from "../../../utils/types.js";
import { ContentTypeSnippetsSyncModel, ContentTypeSyncModel } from "../types/fileContentModel.js";
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
  SyncTypeElement,
  SyncTypeSnippetElement,
  SyncUrlSlugElement,
} from "../types/syncModel.js";
import {
  baseHandler,
  constantHandler,
  Handler,
  makeArrayHandler,
  makeLeafObjectHandler,
  makeObjectHandler,
  makeOrderingHandler,
  optionalHandler,
} from "./combinators.js";
import {
  getAssetReferences,
  getItemReferences,
  OriginalReference,
  replaceAssetReferences,
  replaceItemReferences,
} from "./guidelinesRichText.js";

type HandleAssetElementContext =
  & CommonPropsHandlersContext
  & Readonly<{
    targetAssetCodenames: ReadonlySet<string>;
  }>;

export const makeAssetElementHandler = (
  { targetAssetCodenames, ...restCtx }: HandleAssetElementContext,
): Handler<SyncAssetElement> =>
  makeObjectHandler({
    ...makeCommonPropsHandlers(restCtx),
    asset_count_limit: optionalHandler(makeLeafObjectHandler({})),
    image_width_limit: optionalHandler(makeLeafObjectHandler({})),
    maximum_file_size: optionalHandler(baseHandler),
    allowed_file_types: optionalHandler(baseHandler),
    image_height_limit: optionalHandler(makeLeafObjectHandler({})),
    default: makeDefaultReferencesHandler(targetAssetCodenames),
  });

export const makeCustomElementHandler = (
  ctx: CommonPropsHandlersContext,
): Handler<SyncCustomElement> =>
  makeObjectHandler({
    ...makeCommonPropsHandlers(ctx),
    source_url: baseHandler,
    json_parameters: optionalHandler(baseHandler),
    allowed_elements: optionalHandler(makeArrayHandler(
      ref => ref.codename,
      () => [],
    )),
  });

export const makeMultiChoiceElementHandler = (
  ctx: CommonPropsHandlersContext,
): Handler<SyncMultipleChoiceElement> =>
  makeObjectHandler({
    ...makeCommonPropsHandlers(ctx),
    mode: baseHandler,
    options: makeOrderingHandler(
      makeArrayHandler(
        o => o.codename,
        makeObjectHandler({
          name: baseHandler,
        }),
      ),
      e => e.codename,
    ),
    default: makeDefaultReferencesHandler(),
  });

export const makeRichTextElementHandler = (
  ctx: CommonPropsHandlersContext,
): Handler<SyncRichTextElement> =>
  makeObjectHandler({
    ...makeCommonPropsHandlers(ctx),
    allowed_blocks: optionalHandler(makeArrayHandler(b => b, () => [])),
    image_width_limit: optionalHandler(makeLeafObjectHandler({})),
    allowed_formatting: optionalHandler(makeArrayHandler(f => f, () => [])),
    image_height_limit: optionalHandler(makeLeafObjectHandler({})),
    maximum_image_size: optionalHandler(baseHandler),
    allowed_image_types: optionalHandler(baseHandler),
    allowed_text_blocks: optionalHandler(makeArrayHandler(b => b, () => [])),
    maximum_text_length: optionalHandler(makeLeafObjectHandler({})),
    allowed_table_blocks: optionalHandler(makeArrayHandler(b => b, () => [])),
    allowed_content_types: optionalHandler(makeArrayHandler(ref => ref.codename, () => [])),
    allowed_item_link_types: optionalHandler(makeArrayHandler(ref => ref.codename, () => [])),
    allowed_table_formatting: optionalHandler(makeArrayHandler(f => f, () => [])),
    allowed_table_text_blocks: optionalHandler(makeArrayHandler(b => b, () => [])),
  });

export const makeTaxonomyElementHandler = (
  ctx: CommonPropsHandlersContext,
): Handler<SyncTaxonomyElement> =>
  makeObjectHandler({
    ...makeCommonPropsHandlers(ctx),
    taxonomy_group: (source, target) =>
      !source.codename || source.codename !== target.codename
        ? [{ op: "replace", path: "", value: source, oldValue: target }]
        : [],
    term_count_limit: optionalHandler(makeLeafObjectHandler({})),
    default: makeDefaultReferencesHandler(),
  });

type HandleLinkedItemsElementContext =
  & CommonPropsHandlersContext
  & Readonly<{
    targetItemCodenames: ReadonlySet<string>;
  }>;

export const makeLinkedItemsElementHandler = (
  ctx: HandleLinkedItemsElementContext,
): Handler<SyncLinkedItemsElement> =>
  makeObjectHandler({
    ...makeCommonPropsHandlers(ctx),
    allowed_content_types: optionalHandler(makeArrayHandler(ref => ref.codename, () => [])),
    item_count_limit: optionalHandler(makeLeafObjectHandler({})),
    default: makeDefaultReferencesHandler(ctx.targetItemCodenames),
  });

export const makeSubpagesElementHandler = (
  ctx: HandleLinkedItemsElementContext,
): Handler<SyncSubpagesElement> =>
  makeObjectHandler({
    ...makeCommonPropsHandlers(ctx),
    allowed_content_types: optionalHandler(makeArrayHandler(ref => ref.codename, () => [])),
    item_count_limit: optionalHandler(makeLeafObjectHandler({})),
    default: makeDefaultReferencesHandler(ctx.targetItemCodenames),
  });

export const makeTextElementHandler = (ctx: CommonPropsHandlersContext): Handler<SyncTextElement> =>
  makeObjectHandler({
    ...makeCommonPropsHandlers(ctx),
    maximum_text_length: optionalHandler(makeLeafObjectHandler({})),
    validation_regex: optionalHandler(makeLeafObjectHandler({})),
    default: optionalHandler(makeLeafObjectHandler({
      global: simpleDefaultValueComparator,
    })),
  });

export const makeDateTimeElementHandler = (
  ctx: CommonPropsHandlersContext,
): Handler<SyncDateTimeElement> =>
  makeObjectHandler({
    ...makeCommonPropsHandlers(ctx),
    default: optionalHandler(makeLeafObjectHandler({
      global: simpleDefaultValueComparator,
    })),
  });

export const makeNumberElementHandler = (
  ctx: CommonPropsHandlersContext,
): Handler<SyncNumberElement> =>
  makeObjectHandler({
    ...makeCommonPropsHandlers(ctx),
    default: optionalHandler(makeLeafObjectHandler({
      global: simpleDefaultValueComparator,
    })),
  });

export const makeSnippetElementHandler = (
  ctx: CommonPropsHandlersContext,
): Handler<SyncTypeSnippetElement> =>
  makeObjectHandler({
    type: constantHandler,
    content_group: makeContentGroupHandler(ctx),
    snippet: makeLeafObjectHandler({}),
  });

export const makeUrlSlugElementHandler = (
  ctx: CommonPropsHandlersContext,
): Handler<SyncUrlSlugElement> =>
  makeObjectHandler({
    ...makeCommonPropsHandlers(ctx),
    validation_regex: optionalHandler(makeLeafObjectHandler({})),
    depends_on: makeLeafObjectHandler({
      snippet: (source, target) => source?.codename === target?.codename,
      element: (source, target) => source.codename === target.codename,
    }),
  });

type HandleGuidelinesElementContext =
  & CommonPropsHandlersContext
  & Readonly<{
    targetItemsByCodenames: ReadonlyMap<string, Readonly<{ id: string; codename: string }>>;
    targetAssetsByCodenames: ReadonlyMap<string, Readonly<{ id: string; codename: string }>>;
  }>;

export const makeGuidelinesElementHandler = (
  ctx: HandleGuidelinesElementContext,
): Handler<SyncGuidelinesElement> =>
  makeObjectHandler({
    type: constantHandler,
    content_group: makeContentGroupHandler(ctx),
    guidelines: (source, target) => {
      const sourceRefs = [...getItemReferences(source), ...getAssetReferences(source)];
      const targetRefs = [...getItemReferences(target), ...getAssetReferences(target)];

      // This makes the comparison pass for the most common case of one vs two attributes separated by one space
      const replaceRef = (ref: OriginalReference) => ref.codename && ref.externalId ? "" : " ";
      const sourceWithoutRefs = replaceItemReferences(
        replaceAssetReferences(source, replaceRef),
        replaceRef,
      );
      const targetWithoutRefs = replaceItemReferences(
        replaceAssetReferences(target, replaceRef),
        replaceRef,
      );

      const areRefsSame = sourceRefs.length === targetRefs.length && zip(sourceRefs, targetRefs).every(([s, t]) =>
        (s.codename && s.codename === t.codename) || (s.externalId && s.externalId === t.externalId)
      );

      if (areRefsSame && sourceWithoutRefs === targetWithoutRefs) {
        return [];
      }

      const guidelinesWithTransformedAssetReferences = replaceAssetReferences(source, ref => {
        const targetAsset = ctx.targetAssetsByCodenames.get(ref.codename ?? "");

        return targetAsset ? { internalId: targetAsset.id } : { externalId: ref.externalId ?? "" };
      });
      const sourceToUse = replaceItemReferences(
        guidelinesWithTransformedAssetReferences,
        ref => {
          const targetItem = ctx.targetItemsByCodenames.get(ref.codename ?? "");

          return targetItem ? { internalId: targetItem.id } : { externalId: ref.externalId ?? "" };
        },
      );

      return [{ op: "replace", path: "", value: sourceToUse, oldValue: target }];
    },
  });

type CommonPropsHandlersContext = Readonly<{
  sourceTypeOrSnippet: ContentTypeSnippetsSyncModel | ContentTypeSyncModel;
  targetTypeOrSnippet: ContentTypeSnippetsSyncModel | ContentTypeSyncModel;
}>;

type CommonPropsHandlers = Readonly<{
  name: Handler<string>;
  type: Handler<SyncTypeElement["type"]>;
  guidelines: Handler<string | undefined>;
  is_required: Handler<boolean | undefined>;
  content_group: Handler<CodenameReference | undefined>;
  is_non_localizable: Handler<boolean | undefined>;
}>;

const makeCommonPropsHandlers = (ctx: CommonPropsHandlersContext): CommonPropsHandlers => ({
  name: baseHandler,
  type: constantHandler,
  guidelines: optionalHandler(baseHandler),
  is_required: optionalHandler(baseHandler),
  content_group: makeContentGroupHandler(ctx),
  is_non_localizable: optionalHandler(baseHandler),
});

const makeContentGroupHandler = (
  { sourceTypeOrSnippet }: CommonPropsHandlersContext,
): Handler<CodenameReference | undefined> =>
(source, target) => {
  if (!("content_groups" in sourceTypeOrSnippet)) {
    return []; // elements in snippets can never have content_group defined
  }
  const defaultGroup = apply(g => ({ codename: g.codename }), sourceTypeOrSnippet.content_groups?.[0]) ?? undefined;

  return source?.codename === target?.codename
    ? []
    : [{
      op: "replace",
      path: "",
      value: sourceTypeOrSnippet.content_groups?.some(g => g.codename === source?.codename) ? source : defaultGroup,
      oldValue: target,
    }];
};

type DefaultValue<Value> = { readonly global: { readonly value: Value } };

type ReferencesDefault = DefaultValue<ReadonlyArray<Readonly<{ codename: string; external_id?: string }>>>;

const makeDefaultReferencesHandler = (
  targetCodenames?: { has: (codename: string) => boolean },
): Handler<ReferencesDefault | undefined> =>
  optionalHandler(makeLeafObjectHandler(
    {
      global: ({ value: source }, { value: target }) =>
        source.length === target.length && zip(source, target).every(([s, t]) => s.codename === t.codename),
    },
    apply(tC => source => ({
      global: {
        value: source.global.value
          .map(ref => tC.has(ref.codename) ? { codename: ref.codename } : { external_id: ref.external_id }),
      },
    }), targetCodenames) ?? undefined,
  ));

const simpleDefaultValueComparator = <Value extends string | number>(
  source: DefaultValue<Value>["global"],
  target: DefaultValue<Value>["global"],
) => source.value === target.value;
