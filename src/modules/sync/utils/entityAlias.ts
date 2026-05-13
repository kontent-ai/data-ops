import { type LogOptions, logWarning } from "../../../log.js";
import {
  legacyWebSpotlightAlias,
  type SyncEntityChoice,
  type SyncEntityName,
} from "../constants/entities.js";
import type { SyncEntities, SyncEntitiesInternal } from "../syncRun.js";

const deprecationMessage = '"webSpotlight" entity is deprecated; use "livePreview" instead.';

export const normalizeEntityArrayAlias = (
  entities: ReadonlyArray<SyncEntityChoice>,
  logOptions: LogOptions,
): ReadonlyArray<SyncEntityName> => {
  if (!entities.includes(legacyWebSpotlightAlias)) {
    return entities as ReadonlyArray<SyncEntityName>;
  }
  logWarning(logOptions, "standard", deprecationMessage);
  // Set dedupes when a caller passes both "livePreview" and the "webSpotlight" alias.
  return [
    ...new Set(entities.map((e) => (e === legacyWebSpotlightAlias ? "livePreview" : e))),
  ] as ReadonlyArray<SyncEntityName>;
};

export const normalizeSyncEntitiesAlias = (
  entities: SyncEntities,
  logOptions: LogOptions,
): SyncEntitiesInternal => {
  if (entities.webSpotlight === undefined) {
    return entities;
  }
  logWarning(logOptions, "standard", deprecationMessage);
  const { webSpotlight, ...rest } = entities;
  return {
    ...rest,
    livePreview: rest.livePreview ?? webSpotlight,
  };
};
