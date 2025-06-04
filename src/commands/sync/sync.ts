import type { RegisterCommand } from "../../types/yargs.js";

const commandName = "sync <command>";

const commands = [
  (await import("./run/run.js")).register,
  (await import("./snapshot/snapshot.js")).register,
  (await import("./diff/diff.js")).register,
];

export const register: RegisterCommand = (yargs) =>
  yargs.command({
    command: commandName,
    describe: "sync commands",
    builder: (yargs) => {
      commands.forEach((register) => register(yargs));
      return yargs;
    },
    handler: () => {},
  });
