import type { SpaceContracts } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logInfo } from "../../../../log.js";
import { serially } from "../../../../utils/requests.js";
import { getRequired } from "../../utils/utils.js";
import type { EntityDefinition } from "../entityDefinition.js";

export const spacesEntity = {
  name: "spaces",
  displayName: "spaces",
  fetchEntities: (client) =>
    client
      .listSpaces()
      .toPromise()
      .then((res) => res.rawData),
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
            web_spotlight_root_item: importSpace.web_spotlight_root_item
              ? {
                  id: getRequired(
                    context.contentItemContextByOldIds,
                    importSpace.web_spotlight_root_item.id ?? "missing-ws-root-id",
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
} as const satisfies EntityDefinition<ReadonlyArray<SpaceContracts.ISpaceContract>>;
