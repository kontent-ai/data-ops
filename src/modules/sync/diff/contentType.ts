import { ContentTypeSyncModel } from "../types/fileContentModel.js";
import { SyncGuidelinesElement } from "../types/syncModel.js";
import {
  baseHandler,
  Handler,
  makeArrayHandler,
  makeLeafObjectHandler,
  makeObjectHandler,
  makeOrderingHandler,
  makeUnionHandler,
  optionalHandler,
} from "./combinators.js";
import {
  makeAssetElementHandler,
  makeCustomElementHandler,
  makeDateTimeElementHandler,
  makeGuidelinesElementHandler,
  makeLinkedItemsElementHandler,
  makeMultiChoiceElementHandler,
  makeNumberElementHandler,
  makeRichTextElementHandler,
  makeSnippetElementHandler,
  makeSubpagesElementHandler,
  makeTaxonomyElementHandler,
  makeTextElementHandler,
  makeUrlSlugElementHandler,
} from "./modelElements.js";
import { transformGuidelinesElementToAddModel } from "./transformToAddModel.js";

type HandleContentTypeParams = Readonly<{
  targetItemsByCodenames: ReadonlyMap<string, Readonly<{ id: string; codename: string }>>;
  targetAssetsByCodenames: ReadonlyMap<string, Readonly<{ id: string; codename: string }>>;
}>;

export const makeContentTypeHandler = (
  params: HandleContentTypeParams,
): Handler<ContentTypeSyncModel> =>
  makeObjectHandler({
    name: baseHandler,
    content_groups: optionalHandler(
      makeOrderingHandler(
        makeArrayHandler(g => g.codename, makeObjectHandler({ name: baseHandler })),
        g => g.codename,
      ),
    ),
    elements: {
      contextfulHandler: ({ source, target }) => {
        const ctx = {
          ...params,
          targetAssetCodenames: new Set(params.targetAssetsByCodenames.keys()),
          targetItemCodenames: new Set(params.targetItemsByCodenames.keys()),
          sourceTypeOrSnippet: source,
          targetTypeOrSnippet: target,
        };

        return makeOrderingHandler(
          makeArrayHandler(
            el => el.codename,
            makeUnionHandler("type", {
              number: makeNumberElementHandler(ctx),
              text: makeTextElementHandler(ctx),
              asset: makeAssetElementHandler(ctx),
              guidelines: makeGuidelinesElementHandler(ctx),
              custom: makeCustomElementHandler(ctx),
              snippet: makeSnippetElementHandler(ctx),
              subpages: makeSubpagesElementHandler(ctx),
              taxonomy: makeTaxonomyElementHandler(ctx),
              url_slug: makeUrlSlugElementHandler(ctx),
              date_time: makeDateTimeElementHandler(ctx),
              rich_text: makeRichTextElementHandler(ctx),
              modular_content: makeLinkedItemsElementHandler(ctx),
              multiple_choice: makeMultiChoiceElementHandler(ctx),
            }),
            el =>
              el.type === "guidelines"
                ? transformGuidelinesElementToAddModel({
                  targetItemsReferencedFromSourceByCodenames: params.targetItemsByCodenames,
                  targetAssetsReferencedFromSourceByCodenames: params.targetAssetsByCodenames,
                }, el) as SyncGuidelinesElement
                : el,
          ),
          e => e.codename,
          e => e.content_group?.codename ?? "",
        );
      },
    },
  });

export const wholeContentTypesHandler: Handler<ReadonlyArray<ContentTypeSyncModel>> = makeArrayHandler(
  t => t.codename,
  makeLeafObjectHandler({ name: () => false }), // always replace types with the same codename as this handler only handles whole types not their parts
);
