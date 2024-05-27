import { PatchOperation } from "../types/diffModel.js";
import {
  ContentTypeSyncModel,
  isSyncCustomElement,
  isSyncUrlSlugElement,
  SyncGuidelinesElement,
} from "../types/syncModel.js";
import {
  baseHandler,
  Handler,
  makeAdjustOperationHandler,
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
  makeAdjustOperationHandler(
    (arr) => arr.toSorted(contentTypeOperationsComparator),
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
            {
              groupBy: e => e.content_group?.codename ?? "",
              // at the moment, snippet can't be referenced due to the bug.
              filter: (el) => el.type !== "snippet",
            },
          );
        },
      },
    }),
  );

const patchOpToOrdNumber = (op: PatchOperation) => {
  switch (op.op) {
    case "addInto": {
      if (op.path.includes("content_group")) {
        return 0;
      }
      if (isSyncUrlSlugElement(op.value)) {
        return 25;
      }
      if (isSyncCustomElement(op.value)) {
        return 50;
      }
      return 10;
    }
    case "replace": {
      return 100;
    }
    case "remove": {
      if (isSyncUrlSlugElement(op.oldValue)) {
        return 5;
      }
      if (isSyncCustomElement(op.oldValue)) {
        return 150;
      }
      if (op.path.includes("content_group")) {
        return 200;
      }
      return 185;
    }
    case "move": {
      return 300;
    }
  }
};

const contentTypeOperationsComparator = (el1: PatchOperation, el2: PatchOperation): number =>
  patchOpToOrdNumber(el1) - patchOpToOrdNumber(el2);

export const wholeContentTypesHandler: Handler<ReadonlyArray<ContentTypeSyncModel>> = makeArrayHandler(
  t => t.codename,
  makeLeafObjectHandler({ name: () => false }), // always replace types with the same codename as this handler only handles whole types not their parts
);
