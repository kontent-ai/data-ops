import * as fsPromises from "fs/promises";
import JSZip from "jszip";

import { RegisterCommand } from "../types/yargs.js";

export const register: RegisterCommand = yargs => yargs.command({
  command: "import <fileName> <environmentId>",
  describe: "Imports data into the specified Kontent.ai project.",
  builder: yargs => yargs
    .positional("fileName", {
      type: "string",
      describe: "The name of the zip file with exported data to import.",
      demandOption: "You need to provide the export file name.",
    })
    .positional("environmentId", {
      type: "string",
      describe: "Id of the Kontent.ai environment to export",
      demandOption: "You need to provide the id of the Kontent.ai environment to import into.",
    })
    .option("apiKey", {
      type: "string",
      description: "Kontent.ai Management API key",
      demandOption: "Management API key is necessary for import to work."
    }),
  handler: args => importEntities(args),
});

type ImportEntitiesParams = Readonly<{
  environmentId: string;
  fileName: string;
}>;

const importEntities = async (params: ImportEntitiesParams) => {
  const root = await fsPromises.readFile(params.fileName).then(JSZip.loadAsync);

  console.log("assets: ", await root.file("assets.json")?.async("string"));
};
