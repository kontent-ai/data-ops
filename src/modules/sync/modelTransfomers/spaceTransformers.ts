import { throwError } from "../../../utils/error.js";
import { omit } from "../../../utils/object.js";
import type { EnvironmentModel } from "../generateSyncModel.js";
import type { SpaceSyncModel } from "../types/syncModel.js";

export const transformSpacesModel = (
  environmentModel: EnvironmentModel,
): ReadonlyArray<SpaceSyncModel> =>
  environmentModel.spaces.map((space) => {
    const rootItem = space.root_item;
    const rootItemRef = rootItem
      ? {
          codename:
            environmentModel.items.find((i) => i.id === rootItem.id)?.codename ??
            throwError(
              `Cannot find root item { id: ${rootItem.id} } for space { codename: ${space.codename}}.`,
            ),
        }
      : undefined;

    return {
      ...omit(space, ["id", "web_spotlight_root_item"]),
      root_item: rootItemRef,
      web_spotlight_root_item: rootItemRef,
      collections:
        space.collections?.map((collection) => ({
          codename:
            environmentModel.collections.find((i) => i.id === collection.id)?.codename ??
            throwError(
              `Cannot find collection { id: ${collection.id} } for space { codename: ${space.codename}}.`,
            ),
        })) ?? [],
    };
  });
