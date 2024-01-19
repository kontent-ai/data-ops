import type { JestConfigWithTsJest } from 'ts-jest'

const minute = 60_000;

const jestConfig: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: "tests/integration",
  resolver: "../../jestModuleResolver.cjs",
  testTimeout: 5 * minute,
  transform: {
    ".*": ["ts-jest", {
      tsconfig: "tsconfig.tests.jsonc"
    }]
  },
}

export default jestConfig
