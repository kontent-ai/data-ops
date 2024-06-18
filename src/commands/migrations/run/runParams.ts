import { LogOptions } from "../../../log.js";

export type RunMigrationsParams =
  & Readonly<{
    environmentId: string;
    apiKey: string;
    migrationsFolder: string;
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

export type RunMigrationFilterParams = Pick<RunMigrationsParams, "name" | "range" | "all" | "next">;
