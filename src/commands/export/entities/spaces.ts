import { SpaceContracts } from "@kontent-ai/management-sdk";

import { EntityDefinition } from "../entityDefinition.js";

export const spacesExportEntity: EntityDefinition<ReadonlyArray<SpaceContracts.ISpaceContract>> = {
  name: "spaces",
  fetchEntities: client => client.listSpaces().toPromise().then(res => res.rawData),
  serializeEntities: spaces => JSON.stringify(spaces),
}
