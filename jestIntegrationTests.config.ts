import type { JestConfigWithTsJest } from 'ts-jest'

const minute = 60_000;

const jestConfig: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: "tests/integration",
  testTimeout: 5 * minute,
  maxConcurrency: 1,
  maxWorkers: 2,
  transform: {
    ".*": ["ts-jest", {
      tsconfig: "tsconfig.tests.jsonc"
    }]
  },
}

export default jestConfig
