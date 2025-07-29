import type { CollectionSyncModel } from "../types/syncModel.js";
import {
  baseHandler,
  type Handler,
  makeArrayHandler,
  makeObjectHandler,
  makeOrderingHandler,
} from "./combinators.js";

const collectionHandler: Handler<CollectionSyncModel> = makeObjectHandler({
  name: baseHandler,
});

export const collectionsHandler: Handler<ReadonlyArray<CollectionSyncModel>> = makeOrderingHandler(
  makeArrayHandler((c) => c.codename, collectionHandler),
  (c) => c.codename,
);
