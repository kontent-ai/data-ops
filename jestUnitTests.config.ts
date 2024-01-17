import type { JestConfigWithTsJest } from 'ts-jest'

const jestConfig: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: "tests/unit",
  transform: {
    ".*": ["ts-jest", {
      tsconfig: "tsconfig.tests.jsonc"
    }]
  },
}

export default jestConfig
