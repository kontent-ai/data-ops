import type { SyncEntityChoice } from "../../../modules/sync/constants/entities.js";
import type { SyncEntities } from "../../../modules/sync/syncRun.js";

// Remove "webSpotlight" together with legacyWebSpotlightAlias when the alias is dropped.
const booleanStyleEntities: ReadonlyArray<SyncEntityChoice> = ["livePreview", "webSpotlight"];

export const createSyncEntitiesParameter = (
  entities: ReadonlyArray<SyncEntityChoice>,
): SyncEntities => {
  const entries = entities.map((e) =>
    booleanStyleEntities.includes(e) ? ([e, true] as const) : ([e, () => true] as const),
  );

  return Object.fromEntries(entries);
};
