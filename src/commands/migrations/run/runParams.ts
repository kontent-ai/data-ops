import { LogOptions } from "../../../log.js";
import { MakeUnion } from "../../../utils/types.js";

export type RunMigrationParams =
  & Readonly<{
    environmentId: string;
    apiKey: string;
    folder: string;
    name?: string;
    range?: string;
    all?: boolean;
    next?: number;
    rollback?: boolean;
    statusPlugins?: string;
    continueOnError?: boolean;
    force?: boolean;
    skipConfirmation?: boolean;
  }>
  & LogOptions;

export type RunMigrationFilterParams = Pick<RunMigrationParams, "name" | "range" | "all" | "next">;

export const isOptionUnion = (params: RunMigrationFilterParams): params is MakeUnion<RunMigrationFilterParams> =>
  Object.keys(params).filter(k => ["name", "range", "all", "next"].includes(k)).length === 1;
