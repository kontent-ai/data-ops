import { ManagementClient } from "@kontent-ai/management-sdk";
import { config as dotenvConfig } from "dotenv";
import { v4 as createUuid } from "uuid";

dotenvConfig();

const { API_KEY } = process.env;
const testsRunPrefix = createUuid();

if (!API_KEY) {
  throw new Error("API_KEY env variable was not provided.");
}

export const withTestEnvironment =
  (cloneEnvironmentId: string, testFnc: (environmentId: string) => Promise<void>) =>
  async (): Promise<void> => {
    const envName = `${testsRunPrefix}-test-${createUuid()}`;
    console.log(`Creating test environment "${envName}".`);

    const environmentId = await createTestEnvironment(envName, cloneEnvironmentId);
    console.log(`Environment created with id "${environmentId}". Running the test.`);

    try {
      await testFnc(environmentId);
    } finally {
      console.log("The test is finished, removing the environment.");
      await removeTestEnvironment(environmentId);
      console.log("The environment has been removed.");
    }
  };

const createTestEnvironment = async (name: string, cloneEnvironmentId: string) => {
  const client = new ManagementClient({
    apiKey: API_KEY,
    environmentId: cloneEnvironmentId,
  });

  const testEnvironmentId = await client
    .cloneEnvironment()
    .withData({
      name: name,
    })
    .toPromise()
    .then((res) => res.data.id);

  const testEnvironmentClient = new ManagementClient({
    apiKey: API_KEY,
    environmentId: testEnvironmentId,
  });

  const waitUntilCloned = (environmentId: string): Promise<void> =>
    testEnvironmentClient
      .getEnvironmentCloningState()
      .toPromise()
      .then((res) =>
        res.data.cloningInfo.cloningState === "done"
          ? undefined
          : delay(100).then(() => waitUntilCloned(environmentId)),
      );

  await waitUntilCloned(testEnvironmentId);

  return testEnvironmentId;
};

const removeTestEnvironment = (environmentId: string) => {
  const testEnvironmentClient = new ManagementClient({
    apiKey: API_KEY,
    environmentId,
  });

  return testEnvironmentClient.deleteEnvironment().toPromise();
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
