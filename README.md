# Kontent.ai Data Ops: Control Your Infrastructure & Data (Backup, Restore, Sync, Migrate)

[![NPM Version][npm-shield]][npm-url]
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![Discord][discord-shield]][discord-url]

Kontent.ai Data Ops is a powerful CLI tool designed to streamline data management in your Kontent.ai projects. It supports a wide variety of complex operations, including:
- **Environment Backup**: Export your project's data for backup or migration purposes.
- **Environment Restore**: Easily recreate environments from your backups.
- **Synchronizing and Migrating Data**: Keep content and content models in sync across different projects and environments.
- **Executing Migration Scripts**: Apply changes incrementally using migration scripts and maintain a clear history of modifications.

By automating these processes, Data Ops helps maintain consistency, reduce manual effort, and accelerate your deployment workflows.

---

## Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Commands](#commands)
  - [Examples](#examples)
- [Contributing](#contributing)
  - [How to Contribute](#how-to-contribute)
  - [Code of Conduct](#code-of-conduct)
  - [Getting Started with Development](#getting-started-with-development)
  - [Running Tests](#running-tests)
  - [Prepare Your Testing Project](#prepare-your-testing-project)
  - [Configuration for Testing](#configuration-for-testing)
  - [Structure](#repository-structure)
- [License](#license)
- [Support](#support)
- [Additional Resources](#additional-resources)

---

## Prerequisites

- **Node.js**: Node.js with ESM support (lts).
- **Kontent.ai Account**: Access to your Kontent.ai project with appropriate permissions.
- **Management API Key**: Obtain a Management API key for your project.
- **Preview Delivery API Key**: For Synchronizing content, Preview Delivery API key might be required. 

  > **Security Tip**: Always store your Management API keys securely. Avoid hardcoding them in scripts or sharing them publicly. Use environment variables or secure credential storage solutions when possible.

---

## Getting Started

### Installation

We recommend running data-ops with `npx`. Be aware that npx calls the cached version of the tool. Use @latest to ensure you're using the latest version.


```bash
npx @kontent-ai/data-ops@latest <command>
```

Alternatively, you can install the package globally or locally:

```bash
# Global installation
npm install -g @kontent-ai/data-ops

# Local installation
npm install @kontent-ai/data-ops
```

**Use `-h` or `--help` anytime to get information about available commands and their options.**

```bash
npx @kontent-ai/data-ops@latest --help
# or
yarn dlx @kontent-ai/data-ops --help

# Help for a specific command
npx @kontent-ai/data-ops@latest <command> --help

# If installed globally
data-ops --help
```


### Configuration

All options (including options for commands) can be provided in three different ways:

- **As command-line parameters** (e.g., `--environmentId xxx`)
- **In a JSON configuration file** (e.g., `--configFile params.json`) - *We recommend this approach*
- **As environment variables** with `DATA_OPS_` prefix and transformed into UPPER_SNAKE_CASE (e.g., `DATA_OPS_ENVIRONMENT_ID=xxx npx @kontent-ai/data-ops ...`)


## Commands

The tool usage is based on commands provided in the following format:

```bash
npx @kontent-ai/data-ops@latest <command-name> <command-options>
```

Below are the available commands:

- **environment**:
  - **[backup & restore](./src/commands/environment/backupRestore/README.md)**: Backup & restore your Kontent.ai environment.
  - **[clean](./src/commands/environment/clean/README.md)**: Delete all data from your Kontent.ai environment.
- **sync**:
  - **[snapshot](./src/commands/sync/snapshot/README.md)**: Create a local snapshot from a Kontent.ai environment for the purpose of synchronization.
  - **[diff](./src/commands/sync/diff/README.md)**: Compare two environments.
  - **[run](./src/commands/sync/run/README.md)**: Synchronize content model and environment metadata changes between environments.
- **migrate-content**:
  - **[snapshot](./src/commands/migrateContent/snapshot/README.md)**: Create a local snapshot from selected content items and assets.
  - **[run](./src/commands/migrateContent/run/README.md)**: Migrate content items across environments.
- **[migrations](./src/commands/migrations/README.md)**:
  - **add**: Add new migration scripts.
  - **run**: Execute migration scripts.

> [!NOTE]
> All command functions are publicly exposed, making it easy to include them in your scripts. See the individual command readmes for more information.

### Examples

**Backing up All Data from an Environment with Secure Asset Delivery Enabled**

```bash
npx @kontent-ai/data-ops@latest environment backup \
  --environmentId <environment-id> \
  --apiKey <Management-API-key> \
  --secureAssetDeliveryKey=<Secure-Asset-Delivery-API-key>
```

**Creating an Environment Backup including Content Items and Assets**

```bash
npx @kontent-ai/data-ops@latest environment backup \
  --environmentId <environment-id> \
  --apiKey <Management-API-key> \
  --include contentItems assets
```

**Cleaning an Environment Excluding Taxonomies and Languages**

```bash
npx @kontent-ai/data-ops@latest environment clean \
  --environmentId <environment-id> \
  --apiKey <Management-API-key> \
  --exclude taxonomies languages
```

**Synchronizing Content Types and Snippets Only**

```bash
npx @kontent-ai/data-ops@latest sync run \
  --sourceEnvironmentId <source-environment-id> \
  --sourceApiKey <source-api-key> \
  --targetEnvironmentId <target-environment-id> \
  --targetApiKey <target-api-key> \
  --entities contentTypes contentTypeSnippets
```

>[!Tip]
>
> - **Selective Operations**: Use the `--include` option to operate on a limited set of entities.
> - **Configuration Files**: For complex commands with multiple entities, consider using a configuration file with the `--configFile` option to manage your parameters more easily. 

---

## Contributing

We welcome contributions to the Kontent.ai Data Ops tool!

### How to Contribute

- **Report Issues**: Use the [GitHub Issues](https://github.com/kontent-ai/data-ops/issues) to report bugs or request features.
- **Fork the Repository**: Create a personal fork of the repository on GitHub.
- **Create a Feature Branch**: Use a descriptive name for your branch.
- **Submit a Pull Request**: Submit your changes for review.

Please read our [Contributing Guidelines](CONTRIBUTING.md) for more details.

### Code of Conduct

This project adheres to a [Code of Conduct](https://github.com/kontent-ai/.github/blob/main/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

### Getting Started with Development

- Run `npm ci` to install packages.
- Run `npm run build` to compile the tool.
- Run `node build/src/index.js --help` to run (or `npm run start -- --help`).

### Running Tests

We have comprehensive test suites to ensure the reliability of the Data Ops tool.

- **Unit Tests**: Run `npm run test:unit` to execute unit tests.
- **Integration Tests**: Run `npm run test:integration` to execute integration tests.

> [!IMPORTANT]
> Integration tests require access to a Kontent.ai project and may create temporary environments. Interrupting tests may lead to orphaned environments. Always allow tests to be completed or clean up manually if necessary.

> [!IMPORTANT]
> Run `npm run test:advancedDiff` to compare generated advanced diffs with test baselines.

### Prepare Your Testing Project

To successfully execute integration tests, you must prepare a Kontent.ai project with corresponding environments. You can use the [environment restore](./src/commands/environment/backupRestore/README.md) command to import prepared zip files located at `tests/integration/<testName>/data/<zipName>.zip`.

#### Exporting Test Environments

All Kontent.ai test environments are exported in `tests/integration/<testName>/data/<zipName>.zip`. When you update any of these environments, you should also update the corresponding exported zip files. To streamline this process, we've provided a script called `exportTestEnvironments.js`. You can run it with the command `npm run export:testEnv`. If you need to export specific environments, you can use the following command parameters: `-i` for Import/Export test environment, `-s` for Sync Source Template environment, and `-t` for Sync Target Template environment. For instance, to export only the Sync Source and Sync Target environments, you would run `npm run export:testEnv -- -s -t`.

> [!IMPORTANT]
> Creation and removal of new environments takes some time; therefore, try to keep the number of environment-dependent tests to a minimum.

### Configuration for Testing

The configuration is only necessary to run the integration tests.

- Copy the `.env.template` into `.env`:

  ```bash
  cp .env.template .env
  ```

- Fill in the values (each value is explained in comments in the template).

### Repository Structure

The main part of the tool is located in the `src` folder. The project is structured around commands, with each command defined on the [yargs](https://yargs.js.org/) object in a folder of the same name within the `src/commands` folder. The exported `register` function (of type `RegisterCommand`) must be included in `src/index.ts` in the `commandsToRegister` array.

Tests can be found in `tests/integration` and `tests/unit` folders. Integration tests require Kontent.ai environments and a valid Management API key for successful execution. You can use the `withTestEnvironment` function to provide the tests with a new empty environment.

---

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE) file for details.

---

## Support

If you have any questions or need assistance, please reach out:

- **Kontent.ai Support**: [Contact Support](https://kontent.ai/support/)

---

## Additional Resources

- **Kontent.ai Official Documentation**: [Learn more about Kontent.ai](https://kontent.ai/learn/)

---

[contributors-shield]: https://img.shields.io/github/contributors/kontent-ai/data-ops.svg?style=for-the-badge
[contributors-url]: https://github.com/kontent-ai/data-ops/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/kontent-ai/data-ops.svg?style=for-the-badge
[forks-url]: https://github.com/kontent-ai/data-ops/network/members
[stars-shield]: https://img.shields.io/github/stars/kontent-ai/data-ops.svg?style=for-the-badge
[stars-url]: https://github.com/kontent-ai/data-ops/stargazers
[issues-shield]: https://img.shields.io/github/issues/kontent-ai/data-ops.svg?style=for-the-badge
[issues-url]: https://github.com/kontent-ai/data-ops/issues
[license-shield]: https://img.shields.io/github/license/kontent-ai/data-ops.svg?style=for-the-badge
[license-url]: https://github.com/kontent-ai/data-ops/blob/master/LICENSE.md
[discord-shield]: https://img.shields.io/discord/821885171984891914?color=%237289DA&label=Kontent.ai%20Discord&logo=discord&style=for-the-badge
[discord-url]: https://discord.com/invite/SKCxwPtevJ
[npm-url]: https://www.npmjs.com/package/@kontent-ai/data-ops
[npm-shield]: https://img.shields.io/npm/v/%40kontent-ai%2Fdata-ops?style=for-the-badge&logo=npm&color=%23CB0000
