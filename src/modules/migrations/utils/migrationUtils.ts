export const formatDateForFileName = (date: Date) =>
  `${date.getUTCFullYear()}-`
  + `${("0" + (date.getUTCMonth() + 1)).slice(-2)}-`
  + `${("0" + date.getUTCDate()).slice(-2)}-`
  + `${("0" + date.getUTCHours()).slice(-2)}-`
  + `${("0" + date.getUTCMinutes()).slice(-2)}-`
  + `${("0" + date.getUTCSeconds()).slice(-2)}-`;

export const getMigrationName = (name: string, type: "js" | "ts", prefix?: string) => `${prefix ?? ""}${name}.${type}`;

export const generateTypescriptMigration = (orderDate?: Date): string =>
  `import {MigrationModule} from "@kontent-ai/data-ops";

const migration: MigrationModule = {
  order: ${orderDate ? `new Date('${orderDate.toISOString()}')` : "1"},
  run: async apiClient => {},
  rollback: async apiClient => {},
};

export default migration;
`;

export const generateJavascriptMigration = (orderDate?: Date | null): string =>
  `const migration = {
  order: ${orderDate ? `new Date('${orderDate.toISOString()}')` : "1"},
  run: async apiClient => {},
  rollback: asyncapiClient => {},
};

module.exports = migration;
`;
