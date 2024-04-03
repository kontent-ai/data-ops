import { ContentTypeSnippetsSyncModel } from "../types/fileContentModel.js";
import { SyncGuidelinesElement } from "../types/syncModel.js";
import {
  baseHandler,
  Handler,
  makeArrayHandler,
  makeLeafObjectHandler,
  makeObjectHandler,
  makeUnionHandler,
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
  makeTaxonomyElementHandler,
  makeTextElementHandler,
} from "./modelElements.js";
import { transformGuidelinesElementToAddModel } from "./transformToAddModel.js";

type HandleContentTypeSnippetParams = Readonly<{
  targetItemsByCodenames: ReadonlyMap<string, Readonly<{ id: string; codename: string }>>;
  targetAssetsByCodenames: ReadonlyMap<string, Readonly<{ id: string; codename: string }>>;
}>;
export const makeContentTypeSnippetHandler = (
  params: HandleContentTypeSnippetParams,
): Handler<ContentTypeSnippetsSyncModel> =>
  makeObjectHandler({
    name: baseHandler,
    elements: {
      contextfulHandler: ({ source, target }) => {
        const ctx = {
          ...params,
          targetAssetCodenames: new Set(params.targetAssetsByCodenames.keys()),
          targetItemCodenames: new Set(params.targetItemsByCodenames.keys()),
          sourceTypeOrSnippet: source,
          targetTypeOrSnippet: target,
        };

        return makeArrayHandler(
          el => el.codename,
          makeUnionHandler("type", {
            number: makeNumberElementHandler(ctx),
            text: makeTextElementHandler(ctx),
            asset: makeAssetElementHandler(ctx),
            guidelines: makeGuidelinesElementHandler(ctx),
            custom: makeCustomElementHandler(ctx),
            taxonomy: makeTaxonomyElementHandler(ctx),
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
        );
      },
    },
  });

export const wholeContentTypeSnippetsHandler: Handler<ReadonlyArray<ContentTypeSnippetsSyncModel>> = makeArrayHandler(
  s => s.codename,
  makeLeafObjectHandler({ name: () => false }), // always replace snippets with the same codename as this handler only handles whole snippets not their parts
);
