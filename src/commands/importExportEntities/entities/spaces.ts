import { SpaceContracts } from "@kontent-ai/management-sdk";

import { serially } from "../../../utils/requests.js";
import { EntityDefinition } from "../entityDefinition.js";

export const spacesEntity: EntityDefinition<ReadonlyArray<SpaceContracts.ISpaceContract>> = {
  name: "spaces",
  fetchEntities: client => client.listSpaces().toPromise().then(res => res.rawData),
  serializeEntities: spaces => JSON.stringify(spaces),
  deserializeEntities: JSON.parse,
  importEntities: async (client, entities, context) => {
    // does not add web_spotlight_root as it is not possible to activate Web Spotlight with MAPI
    const newSpaces = await serially(entities.map(importSpace => () =>
      client
        .addSpace()
        .withData({
          name: importSpace.name,
          codename: importSpace.codename,
        }).toPromise()
    ));

    return {
      ...context,
      spaceIdsByOldIds: new Map(entities
        .map(oldSpace => {
          const match = newSpaces.find(s => s.data.codename === oldSpace.codename);

          if (!match) {
            throw new Error(
              `Could not find space with codename ${oldSpace.codename} in the project. This should never happen`,
            );
          }

          return [oldSpace.id, match.data.id];
        })),
    };
  },
};
