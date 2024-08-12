const testsWithHtmlSnapshots = [
  "advancedDiff.test.ts",
];

module.exports = {
  // resolves from test to snapshot path
  resolveSnapshotPath: (testPath, snapshotExtension) =>
    testsWithHtmlSnapshots.some(fileName => testPath.endsWith(fileName))
      ? testPath + snapshotExtension + '.html'
      : testPath + snapshotExtension,

  // resolves from snapshot to test path
  resolveTestPath: (snapshotFilePath, snapshotExtension) =>
    snapshotFilePath.replace(snapshotExtension, ''),

  // Example test path, used for preflight consistency check of the implementation above
  testPathForConsistencyCheck: 'some/__tests__/example.test.js',
};
