import { PatchOperation } from "../types/patchOperation.js";
import { ContentTypeSnippetsSyncModel, isSyncCustomElement, SyncGuidelinesElement } from "../types/syncModel.js";
import {
  baseHandler,
  Handler,
  makeAdjustOperationHandler,
  makeArrayHandler,
  makeObjectHandler,
  makeOrderingHandler,
  makeUnionHandler,
  makeWholeObjectsHandler,
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

        return makeAdjustOperationHandler(
          ops => ops.toSorted(snippetOperationsComparator),
          makeOrderingHandler(
            makeArrayHandler(
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
            ),
            e => e.codename,
          ),
        );
      },
    },
  });

const patchOpToOrdNumber = (op: PatchOperation) => {
  switch (op.op) {
    case "addInto": {
      if (isSyncCustomElement(op.value)) {
        return 50;
      }
      return 10;
    }
    case "replace": {
      return 100;
    }
    case "remove": {
      return 200;
    }
    case "move": {
      return 300;
    }
  }
};

const snippetOperationsComparator = (el1: PatchOperation, el2: PatchOperation): number =>
  patchOpToOrdNumber(el1) - patchOpToOrdNumber(el2);

export const wholeContentTypeSnippetsHandler: Handler<ReadonlyArray<ContentTypeSnippetsSyncModel>> =
  makeWholeObjectsHandler();
