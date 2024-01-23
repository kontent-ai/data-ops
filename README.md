# Kontent.ai Data Ops

[![Contributors][contributors-shield]][contributors-url]
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
    * [Known Limitations](#known-limitations)
  * [Import](#import)
    * [Usage](#usage-1)
    * [Known Limitations](#known-limitations-1)

# Getting Started

Data-ops is a CLI tool for working with data in your Kontent.ai projects.
It runs in Node.js with ESM support (lts).
We recommend running it with `npx`.
Use `-h` or `--help` anytime to get information about available commands or options for a certain command.
```bash
npx @kontent-ai/data-ops --help
# or
yarn dlx @kontent-ai/data-ops --help

# help for a specific command
npx @kontent-ai/data-ops <command> --help
```

## Configuration

All options (including options for commands) can be provided in three different ways:
* As command-line parameters (e.g. `--environmentId xxx`)
* In a `json` configuration file (e.g. `--configFile params.json`)
* As environment variables with `DATA_OPS_` prefix and transformed into UPPER_SNAKE_CASE (e.g. `DATA_OPS_ENVIRONMENT_ID=xxx @kontent-ai/data-ops ...`)

# Commands

The tool is structured around commands.
All commands are structured this way:
```bash
npx @kontent-ai/data-ops <command-name> <command-options>
```

## Export

With the export command you can export data from your Kontent.ai project into a single `.zip` file.
The command uses [the Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2) to get the project data.

### Usage

```bash
npx @kontent-ai/data-ops export --environmentId=<environment-id-to-export> --apiKey=<Management-API-key>
```
For more supported parameters run `npx @kontent-ai/data-ops export --help`.

### Structure of the Exported Data

The exported `.zip` file contains a `.json` file for each exported entity and a `metadata.json` file with additional information.
Format of all the entities is exactly the same as what the [Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/) returns.

> [!TIP]
> If you need the data in a different format, you can process the `.zip` data with variety of other tools to transform it and get what you need.

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
> If you don't want to export roles, you can specify them in the `--exclude` parameter or specify just the other entities in the `--include` parameter
> (e.g. `npx @kontent-ai/data-ops export ... --exclude roles`).
>
> To get more information about the parameters or what other parameters are available, run `npx @kontent-ai/data-ops export --help`.

### Known Limitations

#### Missing Entities

Sitemap and [asset type](https://kontent.ai/learn/docs/assets/asset-organization#a-set-up-the-asset-type) entities are not supported by the Management API and thus are not exported.

#### New Versions of Published Variants

With the current version of the Management API,
it is not possible to read the published version of an item variant that is published and has a [new version](https://kontent.ai/learn/docs/workflows-publishing/create-new-versions) at the same time.
Because of that, the exported data will only contain data of the new versions not the published versions.
Published language variants without new versions created will have all the data.

#### Language Variants Scheduled For Publishing

With the current version of the Management API,
it is not possible to read the time for which a variant is scheduled to be published.
So the exported data only contain the information that the variant is scheduled to be published, but without the date.

#### Performance

The command leverages [the Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2) to get the project data which might be slow for projects with large amounts of content items.

## Import

With the import command you can import data into your Kontent.ai project.
The target project needs to be empty, otherwise the command might fail.
The command uses [the Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2) to import the data.

> [!TIP]
> The command expects the data to import in a `.zip` file in the same [format](#structure-of-the-exported-data) that is produced by the [export command](#export).
>
> If you want to import data from a different format you can use any available tool to convert the data from your format into the supported format.

### Usage

```bash
npx @kontent-ai/data-ops import --fileName <file-to-import> --environmentId <target-environment-id> --apiKey <Management-API-key>
```
For more supported parameters run `npx @kontent-ai/data-ops import --help`.

### Known Limitations

#### Missing Entities

Sitemap, roles and [asset type](https://kontent.ai/learn/docs/assets/asset-organization#a-set-up-the-asset-type) entities are not supported by the Management API and thus are not exported.

#### Role limitations in Workflows

Since it is not possible to import roles, we also don't set role limitations when importing workflows.

#### Web Spotlight

It is not possible to enable [Web Spotlight](https://kontent.ai/learn/develop/hello-web-spotlight) through the Management API so it can't be "imported".
Because of that, it is also not possible to set root item for spaces as this can only be done on environments that have Web Spotlight enabled.

#### New Versions of Published Variants

Since the format doesn't support having a variant with both a published version and a new version, we can't import it.
See the [export command limitation](#new-versions-of-published-variants) for why the limitation is in the format.

#### Language Variants Scheduled For Publishing

Since the format doesn't support having a time for variants scheduled for publishing, we never schedule variants for publishing.
All variants in the file the are scheduled to be published are published immediately during the import process.
See the [export command limitation](#language-variants-scheduled-for-publishing) for why the limitation is in the format.

# Contributing

## Getting Started

* `npm ci` to install packages
* `npm run build` to compile the tool
* `node build/src/index.js --help` to run (or `npm run start -- --help`)

The tool is transpiled into the `build` folder.
TypeScript in tests is handled by [ts-jest](https://www.npmjs.com/package/ts-jest).

### Running tests

* `npm run test:unit` to run unit tests
* `npm run test:integration` to run integration tests (these create temporary Kontent.ai environments and delete them afterwards so don't interrupt them as it's prevent the command from deleting them)

### Configuration

The configuration is only necessary to run the integration tests.

* Copy the `.env.template` into `.env` (`cp .env.template .env`)
* Fill in the values (each value is explained in comments in the template)

## Structure

The main part of the tool is in the `src` folder.
The project is structured around commands.
Each command is defined on the [yargs](https://yargs.js.org/) object in its own file (with the same name) in the `src/commands`.
The exported `register` function (of type `RegisterCommand`) must be included in `src/index.ts` in the `commandsToRegister` array.

You can find tests in the `tests/integration` and `tests/unit` folders.
Integration tests may want a Kontent.ai environment to tests something.
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
