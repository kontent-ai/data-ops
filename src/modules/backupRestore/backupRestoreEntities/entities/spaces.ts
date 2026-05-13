import type { SharedContracts, SpaceContracts } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logInfo } from "../../../../log.js";
import { serially } from "../../../../utils/requests.js";
import { getRequired } from "../../utils/utils.js";
import type { EntityDefinition } from "../entityDefinition.js";

// SDK does not yet expose `root_item` on ISpaceContract; MAPI returns it during
// the transition from `web_spotlight_root_item`. Read either, internally only use root_item.
type SpaceWithRootItem = Readonly<{
  root_item?: SharedContracts.IReferenceObjectContract;
}>;

export type BackupSpace = Omit<SpaceContracts.ISpaceContract, "web_spotlight_root_item"> &
  SpaceWithRootItem;

export const spacesEntity = {
  name: "spaces",
  displayName: "spaces",
  fetchEntities: (client) =>
    client
      .listSpaces()
      .toPromise()
      .then((res) =>
        res.rawData.map((space): BackupSpace => {
          const { web_spotlight_root_item, ...rest } = space;
          const rootItem =
            (space as typeof space & SpaceWithRootItem).root_item ?? web_spotlight_root_item;
          return { ...rest, root_item: rootItem };
        }),
      ),
  serializeEntities: (spaces) => JSON.stringify(spaces),
  deserializeEntities: JSON.parse,
  importEntities: async (client, { entities, context, logOptions }) => {
    const newSpaces = await serially(
      entities.map((importSpace) => () => {
        logInfo(
          logOptions,
          "verbose",
          `Importing: space ${importSpace.id} (${chalk.yellow(importSpace.name)})`,
        );

        // Older backups carry the legacy `web_spotlight_root_item`; newer ones carry `root_item`.
        const legacyRoot = (
          importSpace as BackupSpace & {
            web_spotlight_root_item?: SharedContracts.IReferenceObjectContract;
          }
        ).web_spotlight_root_item;
        const importRootItem = importSpace.root_item ?? legacyRoot;

        return client
          .addSpace()
          .withData({
            name: importSpace.name,
            codename: importSpace.codename,
            collections: importSpace.collections?.map((c) => ({
              id: getRequired(
                context.collectionIdsByOldIds,
                c.id ?? "missing-collection-id",
                "collection",
              ),
            })),
            // MAPI's add-space body still uses web_spotlight_root_item.
            web_spotlight_root_item: importRootItem
              ? {
                  id: getRequired(
                    context.contentItemContextByOldIds,
                    importRootItem.id ?? "missing-ws-root-id",
                    "item",
                  ).selfId,
                }
              : undefined,
          })
          .toPromise();
      }),
    );

    return {
      ...context,
      spaceIdsByOldIds: new Map(
        entities.map((oldSpace) => {
          const match = newSpaces.find((s) => s.data.codename === oldSpace.codename);

          if (!match) {
            throw new Error(
              `Could not find space with codename ${oldSpace.codename} in the project. This should never happen.`,
            );
          }

          return [oldSpace.id, match.data.id];
        }),
      ),
    };
  },
  cleanEntities: async (client, spaces) => {
    if (!spaces.length) {
      return;
    }

    await serially(
      spaces.map((space) => () => client.deleteSpace().bySpaceId(space.id).toPromise()),
    );
  },
} as const satisfies EntityDefinition<ReadonlyArray<BackupSpace>>;
