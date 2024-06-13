import { RegisterCommand } from "../../types/yargs.js";

const commandName = "sync-model <command>";

const runCommand = (await import("./run/run.js")).register;
const exportCommand = (await import("./export/export.js")).register;
const diffCommand = (await import("./diff/diff.js")).register;

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: commandName,
    describe: "sync-model commands",
    builder: yargs => {
      runCommand(yargs);
      exportCommand(yargs);
      diffCommand(yargs);
      return yargs;
    },
    handler: () => {},
  });
