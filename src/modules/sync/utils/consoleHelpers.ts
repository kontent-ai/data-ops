import readline from "node:readline";

import chalk from "chalk";

import { type LogOptions, logInfo } from "../../../log.js";

const requestConfirmation = (message: string) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise<boolean>((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
};

export const checkConfirmation = async (options: {
  message: string;
  skipConfirmation: boolean | undefined;
  logOptions: LogOptions;
}) => {
  const warningMessage = chalk.yellow(options.message);

  const confirmed = !options.skipConfirmation ? await requestConfirmation(warningMessage) : true;

  if (!confirmed) {
    logInfo(options.logOptions, "standard", chalk.red("Operation aborted."));
    process.exit(0);
  }
};
