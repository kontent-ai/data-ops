import dotenv from 'dotenv';
import * as childProcess from "child_process";
import minimist from 'minimist';

dotenv.config();

const resolveParams = (params) => {
  const { i, s, t } = params;

  return !i && !s && !t ? { i: true, s: true, t: true } : { i, s, t };
}

const { i, s, t } = resolveParams(minimist(process.argv.slice(2)));

const { API_KEY, SYNC_SOURCE_TEST_ENVIRONMENT_ID, SYNC_TARGET_TEST_ENVIRONMENT_ID, EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID } = process.env;

if (!EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID) {
  throw new Error("EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID environment variable is not defined.");
}

if (!SYNC_SOURCE_TEST_ENVIRONMENT_ID) {
  throw new Error("SYNC_SOURCE_TEST_ENVIRONMENT_ID environment variable is not defined.");
}
if (!SYNC_TARGET_TEST_ENVIRONMENT_ID) {
  throw new Error("SYNC_TARGET_TEST_ENVIRONMENT_ID environment variable is not defined.");
}

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not defined.");
}

const runCommand = (command, props) => {
  return new Promise((resolve, reject) => {
    const { title, environmentId, path } = props;
    console.log(`Backing up ${title} environment ${environmentId} to ${path}`);
    childProcess.exec(`node ./build/src/index.js ${command}`, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      }

      console.log(`${title} successfully exported`);
      resolve({ stdout, stderr });
    });
  });
};
const syncSourcePath = "tests/integration/sync/data/sync_test_source.zip";
const syncTargetPath = "tests/integration/sync/data/sync_test_target.zip";
const restorePath = "tests/integration/backupRestore/data/backup.zip"

const syncSourceBackupCommand = `environment backup -e=${SYNC_SOURCE_TEST_ENVIRONMENT_ID} -f=${syncSourcePath} -k=${API_KEY}`;
const syncTargetBackupCommand = `environment backup -e=${SYNC_TARGET_TEST_ENVIRONMENT_ID} -f=${syncTargetPath} -k=${API_KEY}`;
const restoreBackupCommand = `environment backup -e=${EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID} -f=${restorePath} -k=${API_KEY}`;

const exportCommands = [
  ...s ? [runCommand(syncSourceBackupCommand, { title: "Sync Source Template test environment", environmentId: SYNC_SOURCE_TEST_ENVIRONMENT_ID, path: syncSourcePath })] : [],
  ...t ? [runCommand(syncTargetBackupCommand, { title: "Sync Target Template test environment", environmentId: SYNC_TARGET_TEST_ENVIRONMENT_ID, path: syncTargetPath })] : [],
  ...i ? [runCommand(restoreBackupCommand, { title: "Restore Backup test environment", environmentId: EXPORT_IMPORT_TEST_DATA_ENVIRONMENT_ID, path: restorePath })] : []
]

await Promise.all(exportCommands);
