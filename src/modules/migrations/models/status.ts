import { z } from "zod";

export type Operation = "run" | "rollback";

export const migrationStatusSchema = z.object({
  name: z.string(),
  success: z.boolean(),
  order: z.union([z.number(), z.coerce.date()]),
  time: z.coerce.date(),
  lastOperation: z.union([z.literal("run"), z.literal("rollback")]).optional(),
}).readonly();

export const statusSchema = z.record(z.string(), migrationStatusSchema.array()).readonly();

export type MigrationStatus = z.infer<typeof migrationStatusSchema>;
export type Status = z.infer<typeof statusSchema>;

export type MigrationOrder = number | Date;

export type SaveStatus = (data: Status) => Promise<void>;
export type ReadStatus = () => Promise<Status>;

export type StatusPlugin = {
  saveStatus: SaveStatus;
  readStatus: ReadStatus;
};

export const statusPluginSchema = z.object({
  saveStatus: z.function().args(statusSchema).returns(z.promise(z.void())),
  readStatus: z.function().returns(z.promise(statusSchema)),
});
