import type { JestConfigWithTsJest } from 'ts-jest'

const jestConfig: JestConfigWithTsJest = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  rootDir: "tests/unit",
  resolver: "../../jestModuleResolver.cjs",
  transform: {
    ".*": ["ts-jest", {
      useESM: true,
      tsconfig: "tsconfig.tests.jsonc"
    }]
  },
}

export default jestConfig
