import type { ManagementClient } from "@kontent-ai/management-sdk";
import { z } from "zod";

export type MigrationOrder = number | Date;

export type MigrationModuleType = "js" | "ts";

export type MigrationModule = Readonly<{
  order: MigrationOrder;
  run(apiClient: ManagementClient): Promise<void>;
  rollback?(apiClient: ManagementClient): Promise<void>;
}>;

const migrationModuleSchema: z.Schema<MigrationModule> = z.object({
  order: z.union([z.number(), z.coerce.date()]),
  run: z.function().args(z.custom<ManagementClient>()).returns(z.promise(z.void())),
  rollback: z.function().args(z.custom<ManagementClient>()).returns(z.promise(z.void())).optional(),
});

export const isMigrationModule = (obj: unknown): obj is MigrationModule =>
  migrationModuleSchema.safeParse(obj).success;

export type Migration = Readonly<{
  name: string;
  module: MigrationModule;
}>;

export type Range = Readonly<{ from: MigrationOrder; to: MigrationOrder }>;
