import type { SharedContracts, SpaceContracts } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logInfo } from "../../../../log.js";
import type {
  SpaceContractWithRootItem,
  SpaceWithRootItem,
} from "../../../../types/spaceContractOverrides.js";
import { omit } from "../../../../utils/object.js";
import { serially } from "../../../../utils/requests.js";
import { getRequired } from "../../utils/utils.js";
import type { EntityDefinition } from "../entityDefinition.js";

export type BackupSpace = Omit<SpaceContracts.ISpaceContract, "web_spotlight_root_item"> &
  SpaceWithRootItem;

type LegacyFileSpace = BackupSpace & {
  web_spotlight_root_item?: SharedContracts.IReferenceObjectContract;
};

export const spacesEntity = {
  name: "spaces",
  displayName: "spaces",
  fetchEntities: async (client) =>
    client
      .listSpaces()
      .toPromise()
      // TODO(sdk-root-item): MAPI returns `root_item`; SDK still types the response as `ISpaceContract`.
      .then((res) =>
        (res.rawData as ReadonlyArray<SpaceContractWithRootItem>).map((space) =>
          omit(space, ["web_spotlight_root_item"]),
        ),
      ),
  serializeEntities: (spaces) => JSON.stringify(spaces),
  deserializeEntities: (serialized) =>
    (JSON.parse(serialized) as ReadonlyArray<LegacyFileSpace>).map(
      ({ web_spotlight_root_item, root_item, ...rest }) => ({
        ...rest,
        root_item: root_item ?? web_spotlight_root_item,
      }),
    ),
  importEntities: async (client, { entities, context, logOptions }) => {
    const newSpaces = await serially(
      entities.map((importSpace) => async () => {
        logInfo(
          logOptions,
          "verbose",
          `Importing: space ${importSpace.id} (${chalk.yellow(importSpace.name)})`,
        );

        return await client
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
            // TODO(sdk-root-item): MAPI accepts `root_item`; SDK types still only expose
            // `web_spotlight_root_item`, hence root_item is spread in (spreads bypass
            // excess-property checks) rather than set as a normal property.
            ...(importSpace.root_item
              ? {
                  root_item: {
                    id: getRequired(
                      context.contentItemContextByOldIds,
                      importSpace.root_item.id ?? "missing-root-item-id",
                      "item",
                    ).selfId,
                  },
                }
              : {}),
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
      spaces.map((space) => async () => client.deleteSpace().bySpaceId(space.id).toPromise()),
    );
  },
} as const satisfies EntityDefinition<ReadonlyArray<BackupSpace>>;
