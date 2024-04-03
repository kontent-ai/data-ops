import { TaxonomySyncModel } from "../types/fileContentModel.js";
import { baseHandler, Handler, makeArrayHandler, makeLeafObjectHandler, makeObjectHandler } from "./combinators.js";

export const makeTaxonomyGroupHandler = (): Handler<TaxonomySyncModel> =>
  makeObjectHandler({
    name: baseHandler,
    terms: makeArrayHandler(
      t => t.codename,
      { lazyHandler: makeTaxonomyGroupHandler },
    ),
  });

export const wholeTaxonomyGroupsHandler: Handler<ReadonlyArray<TaxonomySyncModel>> = makeArrayHandler(
  g => g.codename,
  makeLeafObjectHandler({ name: () => false }), // always replace taxonomy groups with the same codename as this handler only handles whole taxonomy groups not their parts
);
