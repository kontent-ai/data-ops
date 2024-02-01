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
  * [Export](#export)
    * [Usage](#usage)
    * [Structure of the Exported Data](#structure-of-the-exported-data)
  * [Import](#import)
    * [Usage](#usage-1)
  * [Known Limitations](#known-limitations)

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
* In a `json` configuration file (e.g. `--configFile params.json`)
* As environment variables with `DATA_OPS_` prefix and transformed into UPPER_SNAKE_CASE (e.g. `DATA_OPS_ENVIRONMENT_ID=xxx @kontent-ai/data-ops ...`)

# Commands

The tool usage is based on commands provided in the following format:

```bash
npx @kontent-ai/data-ops <command-name> <command-options>
```

## Export

With the `export` command, you can export data from your Kontent.ai environment into a single `.zip` file.
The command uses [the Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2) to get the environment data.

### Usage

```bash
npx @kontent-ai/data-ops export --environmentId=<environment-id-to-export> --apiKey=<Management-API-key>
```
To see all supported parameters, run `npx @kontent-ai/data-ops export --help`.

### Structure of the Exported Data

The exported `.zip` package contains a `.json` file for each exported entity and a `metadata.json` file with additional information.
Format of all the entities is compatible with the output of the [Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/).

> [!TIP]
> If you need the data in a different format, you can process the `.zip` data with a variety of other tools to transform it as per your requirements.

```
- output.zip
|- assetFolders.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Asset-folders
|- assets
 |- All the asset files named <assetId>-<fileName>
|- assets.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Assets
|- contentItems.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Content-items
|- contentTypeSnippets.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Content-type-snippets
|- languageVariants.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Language-variants
|- languages.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/languages
|- metadata.json # version, timestamp, environmentId
|- previewUrls.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Preview-URLs
|- roles.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Roles
|- workflows.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Workflows
```
You can check out exported data of an example project in [the data for integration tests](https://github.com/kontent-ai/data-ops/blob/main/tests/integration/importExport/data/exportSnapshot.zip).

> [!CAUTION]
> Exporting roles requires the [Enterprise plan](https://kontent.ai/pricing).
>
> If you don't want to export roles, you can specify them in the `--exclude` parameter or select only the other entities in the `--include` parameter
> (e.g. `npx @kontent-ai/data-ops export ... --exclude roles`).
>
> To get more information about the parameters or what other parameters are available, run `npx @kontent-ai/data-ops export --help`.


## Import

With the `import` command, you can import data into your Kontent.ai environment.
**The target environment needs to be empty**, otherwise the command might fail.
The command uses [the Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2) to import the data.

> [!TIP]
> The command expects the data for import in a `.zip` file in the same [structure](#structure-of-the-exported-data) that is produced by the [export command](#export).
>
> If you want to import data from a different structure, you can use any available tool to convert it into the supported format.

### Usage

```bash
npx @kontent-ai/data-ops import --fileName <file-to-import> --environmentId <target-environment-id> --apiKey <Management-API-key>
```
To see all supported parameters, run `npx @kontent-ai/data-ops import --help`.

## Known Limitations
### Entity limitations

Roles and [asset type](https://kontent.ai/learn/docs/assets/asset-organization#a-set-up-the-asset-type) entities are currently not being exported due to API limitations.
The tool also can't set role limitations when importing workflows.

### Multiple Versions of content
Since the API format doesn't support language variants with both a published version and a draft version, only the [newest version](https://kontent.ai/learn/docs/workflows-publishing/create-new-versions) will be exported or imported.
Published language variants that don't exist in any other workflow step are exported correctly.

### Content Scheduled For Publishing
As the current API format doesn't support inclusion of the publishing time for variants scheduled to be published, the tool instead puts the scheduled variants into the draft step (the first step in the workflow).

### Web Spotlight
[Web Spotlight](https://kontent.ai/learn/develop/hello-web-spotlight) currently can't be enabled through the tool. As a result, it is not possible to set root item for spaces as this can only be done on environments with Web Spotlight enabled.

### Asset Size
The management API accepts only assets smaller than 100MB.
If your export file contains assets bigger than that (they can be uploaded through the UI), the tool won't be able to import them.

### Performance
The tool leverages the Management API to work with the project data and thus is bound by the API rate limitations.

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
