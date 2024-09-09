import { throwError } from "../../../utils/error.js";
import { omit } from "../../../utils/object.js";
import { EnvironmentModel } from "../generateSyncModel.js";
import { SpaceSyncModel } from "../types/syncModel.js";

export const transformSpacesModel = (
  environmentModel: EnvironmentModel,
): ReadonlyArray<SpaceSyncModel> =>
  environmentModel.spaces.map(space => ({
    ...omit(space, ["id"]),
    web_spotlight_root_item: space.web_spotlight_root_item
      ? {
        codename: environmentModel.items.find(i => i.id === space.web_spotlight_root_item?.id)?.codename
          ?? throwError(
            `Cannot find web spotlight root item { id: ${space.web_spotlight_root_item.id} } for space { codename: ${space.codename}}.`,
          ),
      }
      : undefined,
    collections: space.collections
      ?.map(collection => ({
        codename: environmentModel.collections.find(i => i.id === collection.id)?.codename
          ?? throwError(`Cannot find collection { id: ${collection.id} } for space { codename: ${space.codename}}.`),
      })) ?? [],
  }));
