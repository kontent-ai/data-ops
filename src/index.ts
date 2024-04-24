#!/usr/bin/env node --no-warnings

import chalk from "chalk";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { addLogLevelOptions } from "./log.js";
import { RegisterCommand } from "./types/yargs.js";

const commandsToRegister: ReadonlyArray<RegisterCommand> = [
  (await import("./commands/export.js")).register,
  (await import("./commands/import.js")).register,
  (await import("./commands/clean.js")).register,
  (await import("./commands/generateSyncModel.js")).register,
  (await import("./commands/sync.js")).register,
];

const emptyYargs = yargs(hideBin(process.argv)); // hides the first two arguments - path to script and path to node.js

const initialYargs = emptyYargs
  .wrap(emptyYargs.terminalWidth())
  .env("DATA_OPS")
  .scriptName("data-ops")
  .example("$0 export --apiKey=xxx --environmentId=xxx", "Creates a zip backup of a Kontent.ai environment")
  .example(
    "$0 import --apiKey=xxx --environmentId=xxx --fileName=backupFile",
    "Populates the target Kontent.ai environment with data from the provided zip file.",
  )
  .epilogue("If you have any questions, contact us at devrel@kontent.ai.")
  .demandCommand(1, chalk.red("You need to provide a command to run!"))
  .strict()
  .config("configFile", "Path to a .json configuration file. This is an alternative way to provide CLI parameters.")
  .help("h")
  .alias("h", "help")
  .alias("v", "version");

const withLogLevel = addLogLevelOptions(initialYargs);

commandsToRegister
  .reduce((currentYargs, registerCommand) => registerCommand(currentYargs), withLogLevel)
  .parse();
