# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1](https://github.com/kontent-ai/data-ops/compare/1.0.0...1.0.1) - 2024-2-1

### Changed

- Stream the exported data to the .zip file when exporting data to avoid keeping all the exported data in memory.
- Load data as necessary from the .zip file when importing to avoid loading the whole file at once into memory.
  - The changes above include replacing the jszip library with archiver for creating and node-stream-zip for reading zip files.
- Include taxonomy group codename in taxonomy term external ids when importing to make them unique.

## [1.0.0](https://github.com/kontent-ai/data-ops/tree/1.0.0) - 2024-1-25

- the initial release
