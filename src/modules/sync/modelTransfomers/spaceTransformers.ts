import type { SharedContracts } from "@kontent-ai/management-sdk";

import { throwError } from "../../../utils/error.js";
import { omit } from "../../../utils/object.js";
import type { EnvironmentModel } from "../generateSyncModel.js";
import type { SpaceSyncModel } from "../types/syncModel.js";

// SDK does not yet expose `root_item` on ISpaceContract; MAPI returns it during
// the transition from `web_spotlight_root_item`. Read either, internally only use root_item.
type SpaceWithRootItem = Readonly<{
  root_item?: SharedContracts.IReferenceObjectContract;
}>;

export const transformSpacesModel = (
  environmentModel: EnvironmentModel,
): ReadonlyArray<SpaceSyncModel> =>
  environmentModel.spaces.map((space) => {
    const rootItem =
      (space as typeof space & SpaceWithRootItem).root_item ?? space.web_spotlight_root_item;

    return {
      ...omit(space, ["id", "web_spotlight_root_item"]),
      root_item: rootItem
        ? {
            codename:
              environmentModel.items.find((i) => i.id === rootItem.id)?.codename ??
              throwError(
                `Cannot find root item { id: ${rootItem.id} } for space { codename: ${space.codename}}.`,
              ),
          }
        : undefined,
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
