import { ManagementClient } from "@kontent-ai/management-sdk";

import { MigrationOrder } from "./status.js";

export type MigrationModule = {
  readonly order: number | Date;
  run(apiClient: ManagementClient): Promise<void>;
  rollback?(apiClient: ManagementClient): Promise<void>;
};

export const isMigrationModule = (obj: unknown): obj is MigrationModule =>
  typeof obj === "object"
  && obj !== null
  && "order" in obj && (typeof obj.order === "number" || obj.order instanceof Date)
  && "run" in obj
  && typeof obj.run === "function";

export type Migration = {
  name: string;
  module: MigrationModule;
};

export type Range = { from: MigrationOrder; to: MigrationOrder };
