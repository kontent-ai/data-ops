import { zip } from "../../../utils/array.js";
import type { SpaceSyncModel } from "../types/syncModel.js";
import {
  baseHandler,
  constantHandler,
  type Handler,
  makeLeafObjectHandler,
  makeObjectHandler,
  makeWholeObjectsHandler,
  optionalHandler,
} from "./combinators.js";

export const spaceHandler: Handler<SpaceSyncModel> = makeObjectHandler({
  name: baseHandler,
  root_item: optionalHandler(makeLeafObjectHandler({})),
  // Mirrored from root_item for the deprecation window — no independent diff.
  web_spotlight_root_item: constantHandler,
  collections: (source, target) =>
    source.length !== target.length ||
    zip(source, target).some(([s, t]) => s.codename !== t.codename)
      ? [{ op: "replace", path: "", value: source, oldValue: target }]
      : [],
});

export const wholeSpacesHandler: Handler<ReadonlyArray<SpaceSyncModel>> = makeWholeObjectsHandler();
