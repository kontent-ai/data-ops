import { ManagementClient } from "@kontent-ai/management-sdk";

export type MigrationModule = {
  readonly order: number | Date;
  run(apiClient: ManagementClient): Promise<void>;
  rollback?(apiClient: ManagementClient): Promise<void>;
};
