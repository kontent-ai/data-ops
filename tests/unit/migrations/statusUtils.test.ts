import { describe, expect, it, jest } from "@jest/globals";
import * as fs from "fs";

import { MigrationStatus } from "../../../src/modules/migrations/models/status";
import { createDefaultReadStatus, updateEnvironmentStatus } from "../../../src/modules/migrations/utils/statusUtils";

const createMigrationStatus = (
  name: string,
  order: number | Date,
  success: boolean,
  lastOperation: "run" | "rollback",
): MigrationStatus => ({ name, order, time: new Date(), success, lastOperation });

jest.mock("fs");
const mockFS: jest.Mocked<typeof fs> = jest.mocked(fs);

describe("updateEnvironmentStatus", () => {
  it("correctly updateEnvironmentStatus to contain data from new status", () => {
    const statusToUpdateName = "msigration2";
    const originalEnvStatus = [
      createMigrationStatus("migration1", 1, true, "run"),
      createMigrationStatus(statusToUpdateName, 2, true, "run"),
      createMigrationStatus("migration3", 3, true, "run"),
    ] as const satisfies ReadonlyArray<MigrationStatus>;

    const updateEnvStatus = [
      createMigrationStatus(statusToUpdateName, 2, false, "rollback"),
      createMigrationStatus("migration4", 4, true, "rollback"),
    ] as const satisfies ReadonlyArray<MigrationStatus>;

    const result = updateEnvironmentStatus(originalEnvStatus, updateEnvStatus).map(s => ({ ...s, time: undefined }));

    const expectedResult = [originalEnvStatus[0], updateEnvStatus[0], originalEnvStatus[2], updateEnvStatus[1]]
      .map(s => ({ ...s, time: undefined }));

    expect(result).toStrictEqual(expectedResult);
  });
});

describe("defaultReadStatus", () => {
  it("correctly read status from file content", async () => {
    const migrationStatus: MigrationStatus = createMigrationStatus("migration1", 1, true, "run");
    const inputStatus = { testStatus: [migrationStatus] };

    mockFS.existsSync.mockReturnValue(true);
    mockFS.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(inputStatus)));

    const readStatus = await createDefaultReadStatus("testPath")();

    expect(readStatus).toStrictEqual(inputStatus);
  });

  it("should throw when format of input file is incorrect", async () => {
    const inputStatus = { testStatus: [{ a: "incorrect" }] };

    mockFS.existsSync.mockReturnValue(true);
    mockFS.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(inputStatus)));

    expect(createDefaultReadStatus("testPath")()).rejects.toThrowError();
  });
});
