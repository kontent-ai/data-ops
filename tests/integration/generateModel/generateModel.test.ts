import { describe, expect, it } from "@jest/globals";
import { config as dotenvConfig } from "dotenv";
import * as fsPromises from "fs/promises";

import { loadContentModelFromFolder } from "../importExport/utils/envData";
import { runCommand } from "../utils/runCommand";

dotenvConfig();

const { EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID, API_KEY } = process.env;

if (!EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID) {
  throw new Error("EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID environment variable is not defined.");
}
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not defined.");
}

describe("generate-sync-model integration test", () =>
  it("generate model", async () => {
    const folderPath = "./tests/integration/generateModel/data/contentModel";
    await fsPromises.rm(folderPath, { force: true, recursive: true });
    const command = `generate-sync-model -e ${EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID} -k ${API_KEY} -f ${folderPath}`;

    await runCommand(command);

    const contentModel = await loadContentModelFromFolder(folderPath);

    CheckNoIdAndRequiredCodenames(contentModel);

    expect(contentModel).toMatchSnapshot();
  }));

const CheckNoIdAndRequiredCodenames = (obj: object): void => {
  expect(obj).not.toHaveProperty("id");
  expect(obj).not.toHaveProperty("last_modified");
  Object.entries(obj).forEach(([key, value]) => {
    if (referenceProperties.includes(key)) {
      expect(value).toHaveProperty("codename");

      return;
    }
    if (referenceArrayProperties.includes(key)) {
      (value as Array<unknown>).forEach(v => {
        expect(v).toHaveProperty("codename");
      });

      return;
    }
    if (key === "default") {
      const values = value.global.value;
      if (Array.isArray(values)) {
        values.forEach(v => {
          expect(v).toHaveProperty("codename");
        });
      }

      return;
    }
    if (Array.isArray(value)) {
      value.forEach(v => {
        if (typeof v === "object") {
          CheckNoIdAndRequiredCodenames(v);
        }
      });

      return;
    }
    if (typeof value === "object") {
      CheckNoIdAndRequiredCodenames(value);

      return;
    }
  });
};

const referenceProperties = ["snippet", "taxonomy_group", "content_group"];
const referenceArrayProperties = ["allowed_content_types", "allowed_elements", "allowed_item_link_types"];
