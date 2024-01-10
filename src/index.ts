#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { RegisterCommand } from "./types/yargs.js";

const commandsToRegister: ReadonlyArray<RegisterCommand> = [
  (await import("./commands/export.js")).register,
  (await import("./commands/import.js")).register,
];

const initialYargs = yargs(hideBin(process.argv)) // hides the first two arguments - path to script and path to node.js
  .env("KAI")
  .example("kai export --apiKey=xxx --environmentId=xxx", "Creates zip backup of Kontent.ai project")
  .example(
    "kai import --apiKey=xxx --environmentId=xxx --fileName=backupFile",
    "Read given zip file and recreates data in Kontent.ai project",
  )
  .demandCommand()
  .strict()
  .help("h");

commandsToRegister
  .reduce((currentYargs, registerCommand) => registerCommand(currentYargs), initialYargs)
  .parse();
