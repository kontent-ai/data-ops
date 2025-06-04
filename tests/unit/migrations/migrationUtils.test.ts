import { ManagementClient } from "@kontent-ai/management-sdk";
import { describe, expect, it, vitest } from "vitest";

import type { Migration } from "../../../src/modules/migrations/models/migration.ts";
import type { MigrationStatus } from "../../../src/modules/migrations/models/status.ts";
import {
  executeMigrations,
  filterMigrations,
  getMigrationsToSkip,
  getMigrationsWithDuplicateOrders,
} from "../../../src/modules/migrations/utils/migrationUtils.ts";

const migrations = [
  { name: "Migration1", module: { order: 1, run: async () => {} } },
  { name: "Migration2", module: { order: 2, run: async () => {} } },
  { name: "Migration4", module: { order: new Date("2024-03-07"), run: async () => {} } },
  { name: "Migration3", module: { order: 3, run: async () => {} } },
  {
    name: "Migration5",
    module: {
      order: new Date("2024-04-07"),
      run: () => {
        throw new Error("Test fail");
      },
    },
  },
] as const satisfies ReadonlyArray<Migration>;

const createMigrationStatus = (
  name: string,
  order: number | Date,
  success: boolean,
  lastOperation: "run" | "rollback",
): MigrationStatus => ({ name, order, time: new Date(), success, lastOperation });

describe("filterMigrations", () => {
  it("Correctly filters migrations for all parameter", () => {
    const filteredMigrations = filterMigrations(migrations, { all: true });

    expect(filteredMigrations).toStrictEqual(migrations);
  });

  it("Correctly filters migrations for range parameter", () => {
    const filteredMigrations = filterMigrations(migrations, {
      range: { from: 2, to: new Date("2024-03-07") },
    });

    expect(filteredMigrations).toStrictEqual([migrations[1], migrations[2], migrations[3]]);
  });

  it("Correctly filters migrations for name parameter", () => {
    const filteredMigrations = filterMigrations(migrations, { name: migrations[0].name });

    expect(filteredMigrations).toStrictEqual([migrations[0]]);
  });
});

describe("getMigrationsToSkip", () => {
  it("Correctly return skipped successfully migrated migrations", () => {
    const environmentStatus: ReadonlyArray<MigrationStatus> = [
      createMigrationStatus(migrations[0].name, migrations[0].module.order, true, "run"),
      createMigrationStatus(migrations[2].name, migrations[2].module.order, true, "run"),
    ];

    const skippedMigrations = getMigrationsToSkip(environmentStatus, migrations, "run");

    expect(skippedMigrations).toStrictEqual([migrations[0], migrations[2]]);
  });

  it("Correctly return skipped successfully migrated migrations and does not return not successful migration", () => {
    const environmentStatus: ReadonlyArray<MigrationStatus> = [
      createMigrationStatus(migrations[0].name, migrations[0].module.order, true, "run"),
      createMigrationStatus(migrations[2].name, migrations[2].module.order, false, "run"),
    ];
    const skippedMigrations = getMigrationsToSkip(environmentStatus, migrations, "run");

    expect(skippedMigrations).toStrictEqual([migrations[0]]);
  });

  it("Correctly return does not return any migration when operation is opposite", () => {
    const environmentStatus: ReadonlyArray<MigrationStatus> = [
      createMigrationStatus(migrations[0].name, migrations[0].module.order, true, "run"),
      createMigrationStatus(migrations[1].name, migrations[1].module.order, false, "run"),
    ];
    const skippedMigrations = getMigrationsToSkip(environmentStatus, migrations, "rollback");

    expect(skippedMigrations).toStrictEqual([migrations[2], migrations[3], migrations[4]]);
  });
});

describe("getMigrationsWithDuplicateOrders", () => {
  it.each([
    [[{ ...migrations[0] }, { ...migrations[0] }]],
    [[{ ...migrations[2] }, { ...migrations[2] }]],
  ])("Correctly return non empty map when multiple migrations have same order", (c) => {
    const sameOrderMigrations = getMigrationsWithDuplicateOrders(c);
    expect(sameOrderMigrations).toStrictEqual(new Map([[c[0]?.module.order, [c[0], c[1]]]]));
  });
});

describe("executeMigrations", () => {
  it("Correctly executesMigration", async () => {
    const migrationsToRun = [migrations[0], migrations[1]];

    const migration0Run = vitest.spyOn(migrations[0].module, "run");
    const migration1Run = vitest.spyOn(migrations[1].module, "run");

    const client = new ManagementClient({ environmentId: "-", apiKey: "-" });

    const migrationStatus = await executeMigrations(
      migrationsToRun,
      client,
      { continueOnError: false, operation: "run" },
      { logLevel: "none" },
    );

    expect(migration0Run).toHaveBeenCalledTimes(1);
    expect(migration0Run).toHaveBeenCalledWith(client);
    expect(migration1Run).toHaveBeenCalledTimes(1);
    expect(migration1Run).toHaveBeenCalledWith(client);

    const migrationStatusWithoutDate = migrationStatus.status.map((s) => ({
      ...s,
      time: undefined,
    }));
    const expectedResult = [
      createMigrationStatus(migrations[0].name, migrations[0].module.order, true, "run"),
      createMigrationStatus(migrations[1].name, migrations[1].module.order, true, "run"),
    ].map((s) => ({ ...s, time: undefined }));

    expect(migrationStatusWithoutDate).toStrictEqual(expectedResult);
  });

  it("Correctly executesMigration returns error", async () => {
    const migrationsToRun = [migrations[4], migrations[0]];

    const migrationStatus = await executeMigrations(
      migrationsToRun,
      new ManagementClient({ environmentId: "-", apiKey: "-" }),
      { continueOnError: false, operation: "run" },
      { logLevel: "none" },
    );

    const migrationStatusWithoutDate = migrationStatus.status.map((s) => ({
      ...s,
      time: undefined,
    }));
    const expectedStatusResult = [
      createMigrationStatus(migrations[4].name, migrations[4].module.order, false, "run"),
    ].map((s) => ({ ...s, time: undefined }));

    expect(migrationStatusWithoutDate).toStrictEqual(expectedStatusResult);
    expect(migrationStatus.error).toBeTruthy();
  });

  it("Correctly executesMigration continues on error returns status with error", async () => {
    const migrationsToRun = [migrations[4], migrations[0]];

    const migrationStatus = await executeMigrations(
      migrationsToRun,
      new ManagementClient({ environmentId: "-", apiKey: "-" }),
      { continueOnError: true, operation: "run" },
      { logLevel: "none" },
    );

    const migrationStatusWithoutDate = migrationStatus.status.map((s) => ({
      ...s,
      time: undefined,
    }));
    const expectedStatusResult = [
      createMigrationStatus(migrations[4].name, migrations[4].module.order, false, "run"),
      createMigrationStatus(migrations[0].name, migrations[0].module.order, true, "run"),
    ].map((s) => ({ ...s, time: undefined }));

    expect(migrationStatusWithoutDate).toStrictEqual(expectedStatusResult);
  });
});
