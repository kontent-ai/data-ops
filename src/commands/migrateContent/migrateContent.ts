import type { RegisterCommand } from "../../types/yargs.js";

const commandName = "migrate-content <command>";

const runCommand = (await import("./run/run.js")).register;
const exportCommand = (await import("./snapshot/snapshot.js")).register;

export const register: RegisterCommand = (yargs) =>
  yargs.command({
    command: commandName,
    describe: "migrate-content commands",
    builder: (yargs) => {
      runCommand(yargs);
      exportCommand(yargs);
      return yargs;
    },
    handler: () => {},
  });
