import { RegisterCommand } from "../../types/yargs.js";

const commandName = "migrations <command>";

const commands = [
  (await import("./run/run.js")).register,
  (await import("./add/add.js")).register,
];

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: commandName,
    describe: "migrations commands",
    builder: yargs => {
      commands.forEach(register => register(yargs));
      return yargs;
    },
    handler: () => {},
  });
