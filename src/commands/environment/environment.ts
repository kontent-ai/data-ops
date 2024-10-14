import { RegisterCommand } from "../../types/yargs.js";

const commandName = "environment <command>";

const commands = [
  (await import("./clean/clean.js")).register,
  (await import("./importExport/import.js")).register,
  (await import("./importExport/export.js")).register,
];

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: commandName,
    describe: "environment commands",
    builder: yargs => {
      commands.forEach(register => register(yargs));
      return yargs;
    },
    handler: () => {},
  });
