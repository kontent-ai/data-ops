import type { AssetFolderSyncModel } from "../types/syncModel.js";
import { type Handler, baseHandler, makeArrayHandler, makeObjectHandler } from "./combinators.js";

const assetFolderHandler: Handler<AssetFolderSyncModel> = makeObjectHandler({
  name: baseHandler,
  folders: { contextfulHandler: () => makeArrayHandler((f) => f.codename, assetFolderHandler) },
});

export const assetFoldersHandler: Handler<ReadonlyArray<AssetFolderSyncModel>> = makeArrayHandler(
  (f) => f.codename,
  assetFolderHandler,
);
