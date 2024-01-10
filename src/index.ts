#!/usr/bin/env node

import chalk from "chalk";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { addLogLevelOptions } from "./log.js";
import { RegisterCommand } from "./types/yargs.js";

const commandsToRegister: ReadonlyArray<RegisterCommand> = [
  (await import("./commands/export.js")).register,
  (await import("./commands/import.js")).register,
];

const emptyYargs = yargs(hideBin(process.argv)); // hides the first two arguments - path to script and path to node.js

const initialYargs = emptyYargs
  .wrap(emptyYargs.terminalWidth())
  .env("KAI")
  .example("$0 export --apiKey=xxx --environmentId=xxx", "Creates zip backup of Kontent.ai project")
  .example(
    "$0 import --apiKey=xxx --environmentId=xxx --fileName=backupFile",
    "Read given zip file and recreates data in Kontent.ai project",
  )
  .epilogue("If you have any questions, contact us at devrel@kontent.ai.")
  .demandCommand(1, chalk.red("You need to provide a command to run!"))
  .strict()
  .help("h")
  .alias("h", "help");

const withLogLevel = addLogLevelOptions(initialYargs);

commandsToRegister
  .reduce((currentYargs, registerCommand) => registerCommand(currentYargs), withLogLevel)
  .parse();
