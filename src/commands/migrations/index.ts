import { Replace } from "../../utils/types.js";
import { addMigration as runAddMigration, AddMigrationParams as AddParams } from "./add/add.js";

export type AddMigrationParams = Replace<AddParams, { type: "js" | "ts" }>;
export const addMigration = (params: AddMigrationParams) => runAddMigration(params);

export { runMigrations } from "./run/run.js";
export { RunMigrationsParams } from "./run/runParams.js";
