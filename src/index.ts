#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { RegisterCommand } from "./types/yargs.js";

const commandsToRegister: ReadonlyArray<RegisterCommand> = [
  (await import("./commands/export.js")).register,
];

const initialYargs = yargs(hideBin(process.argv))
  .env("KAI")
  .demandCommand()
  .strict()
  .help();

commandsToRegister
  .reduce((currentYargs, registerCommand) => registerCommand(currentYargs), initialYargs)
  .parse();
