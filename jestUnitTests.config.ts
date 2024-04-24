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
  //node_module are not trannsformed by default
  transformIgnorePatterns: [
    "/node_modules/(?!chalk/.*)" // chalk has problem without transformation
  ]
}

export default jestConfig
