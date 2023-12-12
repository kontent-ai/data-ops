import { RoleContracts } from "@kontent-ai/management-sdk";

import { EntityDefinition } from "../entityDefinition.js";

export const rolesExportEntity: EntityDefinition<ReadonlyArray<RoleContracts.IRoleContract>> = {
  name: "roles",
  fetchEntities: client => client.listRoles().toPromise().then(res => res.rawData.roles),
  serializeEntities: collections => JSON.stringify(collections),
  importEntities: () => {
    throw new Error("Not supported yet.");
  },
  deserializeEntities: () => {
    throw new Error("Not supported yet.");
  },
};
