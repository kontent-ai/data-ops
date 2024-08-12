import type { JestConfigWithTsJest } from 'ts-jest'

const minute = 60_000;

const jestConfig: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: "tests/integration",
  resolver: "../../jestModuleResolver.cjs",
  snapshotResolver: "../../jestSnapshotsResolver.cjs",
  testTimeout: 5 * minute,
  transform: {
    ".*": ["ts-jest", {
      tsconfig: "tsconfig.tests.jsonc"
    }]
  },
  //node_module are not trannsformed by default
  transformIgnorePatterns: [
    "/node_modules/(?!chalk/.*)" // chalk has problem without transformation
  ]
}

export default jestConfig
