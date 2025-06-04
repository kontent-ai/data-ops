import type { LanguageSyncModel } from "../types/syncModel.js";
import {
  type Handler,
  baseHandler,
  constantHandler,
  makeLeafObjectHandler,
  makeObjectHandler,
  makeWholeObjectsHandler,
  optionalHandler,
} from "./combinators.js";

export const languageHandler: Handler<LanguageSyncModel> = makeObjectHandler({
  name: baseHandler,
  is_active: baseHandler,
  is_default: constantHandler,
  fallback_language: optionalHandler(
    makeLeafObjectHandler({
      codename: (source, target) => source === target,
    }),
  ),
});

export const wholeLanguageHandler: Handler<ReadonlyArray<LanguageSyncModel>> =
  makeWholeObjectsHandler();
