# Kontent.ai Data Ops

Data-ops is a CLI tool for working with data in your Kontent.ai projects.
It runs in Node.js with ESM support (lts).

[![Contributors][contributors-shield]][contributors-url]
[![NPM Version][npm-shield]][npm-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![Discord][discord-shield]][discord-url]

# Contents

* [Getting Started](#getting-started)
  * [Configuration](#configuration)
* [Commands](#commands)
* [Contributing](#contributing)

# Getting Started

We recommend running data-ops with `npx`.
Use `-h` or `--help` anytime to get information about available commands and their options.
```bash
npx @kontent-ai/data-ops --help
# or
yarn dlx @kontent-ai/data-ops --help

# help for a specific command
npx @kontent-ai/data-ops <command> --help

# you can also install the package globally, or locally
npm i @kontent-ai/data-ops -g

# with the package installed, you can call the tool as follows
data-ops --help
```

## Configuration

All options (including options for commands) can be provided in three different ways:
* As command-line parameters (e.g. `--environmentId xxx`)
* In a `json` configuration file (e.g. `--configFile params.json`) - we recommend this approach
* As environment variables with `DATA_OPS_` prefix and transformed into UPPER_SNAKE_CASE (e.g. `DATA_OPS_ENVIRONMENT_ID=xxx @kontent-ai/data-ops ...`)

# Commands

The tool usage is based on commands provided in the following format:

```bash
npx @kontent-ai/data-ops <command-name> <command-options>
```

The instruction for the command are presented in the README.md files in command's individual folders ([./src/commands](./src/commands)). Data-ops supports these commands:
- [import & export](./src/commands/importExport/README.md)
- [clean](./src/commands/clean/README.md)
- [sync](./src/commands/sync/README.md)
- [diff](./src/commands/diff/README.md)
- [generate-sync-model](./src/commands/generateSyncModel/README.md)

# Contributing

## Getting Started

* `npm ci` to install packages
* `npm run build` to compile the tool
* `node build/src/index.js --help` to run (or `npm run start -- --help`)

The tool is transpiled into the `build` folder.
TypeScript in tests is handled by [ts-jest](https://www.npmjs.com/package/ts-jest).

### Running tests

* `npm run test:unit` to run unit tests
* `npm run test:integration` to run integration tests (these create temporary Kontent.ai environments and delete them afterwards, interrupting the tests while they're running may lead to orphaned environments in your project)

### Configuration

The configuration is only necessary to run the integration tests.

* Copy the `.env.template` into `.env` (`cp .env.template .env`)
* Fill in the values (each value is explained in comments in the template)

## Structure

The main part of the tool is in the `src` folder.
The project is structured around commands, with each command defined on the [yargs](https://yargs.js.org/) object in its own file (with the same name) in the `src/commands` folder.
The exported `register` function (of type `RegisterCommand`) must be included in `src/index.ts` in the `commandsToRegister` array.

You can find tests in the `tests/integration` and `tests/unit` folders.
Integration tests require Kontent.ai environments and a valid MAPI key to run.
You can use the `withTestEnvironment` function to provide the tests with a new empty environment.
Try to limit the number of tests that require the environment as it takes some time to create and remove it.

[contributors-shield]: https://img.shields.io/github/contributors/kontent-ai/data-ops.svg?style=for-the-badge
[contributors-url]: https://github.com/kontent-ai/data-ops/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/kontent-ai/data-ops.svg?style=for-the-badge
[forks-url]: https://github.com/kontent-ai/data-ops/network/members
[stars-shield]: https://img.shields.io/github/stars/kontent-ai/data-ops.svg?style=for-the-badge
[stars-url]: https://github.com/kontent-ai/data-ops/stargazers
[issues-shield]: https://img.shields.io/github/issues/kontent-ai/data-ops.svg?style=for-the-badge
[issues-url]:https://github.com/kontent-ai/data-ops/issues
[license-shield]: https://img.shields.io/github/license/kontent-ai/data-ops.svg?style=for-the-badge
[license-url]:https://github.com/kontent-ai/data-ops/blob/master/LICENSE.md
[discord-shield]: https://img.shields.io/discord/821885171984891914?color=%237289DA&label=Kontent.ai%20Discord&logo=discord&style=for-the-badge
[discord-url]: https://discord.com/invite/SKCxwPtevJ
[npm-url]: https://www.npmjs.com/package/@kontent-ai/data-ops
[npm-shield]: https://img.shields.io/npm/v/%40kontent-ai%2Fdata-ops?style=for-the-badge&logo=npm&color=%23CB0000
