import type { RegisterCommand } from "../../types/yargs.js";

const commandName = "export <command>";

const exportMarkdownCommand = (await import("./exportMarkdown/exportMarkdown.js")).register;

export const register: RegisterCommand = (yargs) =>
  yargs.command({
    command: commandName,
    describe: "export commands",
    builder: (yargs) => {
      exportMarkdownCommand(yargs);
      return yargs;
    },
    handler: () => {},
  });
