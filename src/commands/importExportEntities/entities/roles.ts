import { RoleContracts } from "@kontent-ai/management-sdk";

import { EntityExportDefinition } from "../entityDefinition.js";

export const rolesExportEntity: EntityExportDefinition<ReadonlyArray<RoleContracts.IRoleContract>> = {
  name: "roles",
  displayName: "roles",
  fetchEntities: client => client.listRoles().toPromise().then(res => res.rawData.roles),
  serializeEntities: collections => JSON.stringify(collections),
};
