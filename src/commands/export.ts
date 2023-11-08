import { RegisterCommand } from "../types/yargs.js";

export const register: RegisterCommand = yargs => yargs.command({
  command: "export",
  describe: "Exports data from the specified Kontent.ai project.",
  builder: yargs => yargs
    .option("contentTypes", {
      type: "boolean",
      describe: "Should export content types.",
      demandOption: true,
      alias: ["types", "t"],
    }),
  handler: async (args) => console.log("Exporting... ", args.contentTypes),
});
