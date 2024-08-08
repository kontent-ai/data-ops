import dotenv from 'dotenv';
import * as childProcess from "child_process";
import minimist from 'minimist';

const { i, s, t } = minimist(process.argv.slice(2));

dotenv.config();

const { API_KEY, SYNC_SOURCE_TEST_ENVIRONMENT_ID, SYNC_TARGET_TEST_ENVIRONMENT_ID, EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID } = process.env;

if (!i && !s && !t) {
  console.log("You need to atleast one of the arguments: -i for Import Environment, -s for Sync Source Environment, -t for Sync Target Environment");
}

const runCommand = (command, props) => {
  return new Promise((resolve, reject) => {
    const { title, environmentId, path } = props;
    console.log(`Exporting ${title} environment ${environmentId} to ${path}`);
    childProcess.exec(`node ./build/src/index.js ${command}`, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      }

      console.log(`${title} sucessfully exported`);
      resolve({ stdout, stderr });
    });
  });
};
const syncSourcePath = "tests/integration/sync/data/sync_test_source.zip";
const syncTargetPath = "tests/integration/sync/data/sync_test_target.zip";
const importPath = "tests/integration/importExport/data/exportedData.zip"

const syncSourceExportCommand = `export -e=${SYNC_SOURCE_TEST_ENVIRONMENT_ID} -f=${syncSourcePath} -k=${API_KEY}`;
const syncTargetExportCommand = `export -e=${SYNC_TARGET_TEST_ENVIRONMENT_ID} -f=${syncTargetPath} -k=${API_KEY}`;
const importExportCommand = `export -e=${EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID} -f=${importPath} -k=${API_KEY}`;

const exportCommands = [
  ...s ? [runCommand(syncSourceExportCommand, { title: "Sync Source Template", environmentId: SYNC_SOURCE_TEST_ENVIRONMENT_ID, path: syncSourcePath })] : [],
  ...t ? [runCommand(syncTargetExportCommand, { title: "Sync Target Template", environmentId: SYNC_TARGET_TEST_ENVIRONMENT_ID, path: syncTargetPath })] : [],
  ...i ? [runCommand(importExportCommand, { title: "Import Export Project", environmentId: EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID, path: importPath })] : []
]

await Promise.all(exportCommands);