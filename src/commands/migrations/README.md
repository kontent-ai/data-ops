# Migrations

The `migrations` command provides tools to write and execute migration scripts for managing Kontent.ai environments using the Management API. It consists of two subcommands:

- [`add`](#migrations-add): Create a new migration script.
- [`run`](#migrations-run): Execute migration scripts against a Kontent.ai environment.

> **Note**
>
> The data-ops migration tools support only JavaScript files. If you write your migrations in TypeScript or any other language, you must transpile your code before running them.


> **Caution**
>
> Data-ops can only work with ES Modules. Ensure you use ES `.js` scripts or transpile your `.ts` files into ES Modules.

---

## Migrations Add

The `migrations add` command creates a Kontent.ai migration script file in JavaScript or TypeScript. The generated script contains a module object with three properties:

- **`order`**: Determines the sequence in which migrations are executed. The order can be specified as either a number or a date.
- **`run`**: Implement this function to execute the migration script using the Kontent.ai Management SDK, which is provided via the `client` parameter.
- **`rollback`** (optional): Implement this function to reverse the changes made by the migration, if necessary.

### Usage

```bash
npx @kontent-ai/data-ops@latest migrations add \
  --migrationsFolder <path-to-folder> \
  --name <migration-name>
```

To see all supported parameters, run:

```bash
npx @kontent-ai/data-ops@latest migrations add --help
```

### Parameters

| Parameter               | Description                                                                                                     |
|-------------------------|-----------------------------------------------------------------------------------------------------------------|
| `--migrationsFolder`    | The path to the folder where the migration script will be created.                                               |
| `--name`                | The name of the migration script.                                                                                |
| `--dateOrder`, `-d`     | (Optional) Use date-based ordering for the migration script. The script file will be named with the current UTC date and time. |

### Ordering Rules

- **Number vs. Date Ordering**: Ordering by number takes precedence over ordering by dates. When executing multiple migrations, those with number-based orders will run first, followed by those with date-based orders.
- **Unique Order Value**: The `order` must be a unique positive integer or zero, or a unique date string.
- **Gaps Allowed**: There may be gaps between migrations. For example, the following sequence is acceptable: `0, 3, 4, 5, 10`.
- **Date Ordering**: To use date ordering, utilize the `--dateOrder` (`-d`) option. The CLI will generate a new file named with the date in UTC format and the specified name. Additionally, the `order` property within the file will be set to the corresponding date.
- **Combining Orders**: Number and date orders can be combined within a migrations folder.

### Example

**Creating a Migration Script with Number Ordering**

```bash
npx @kontent-ai/data-ops@latest migrations add \
  --migrationsFolder ./migrations \
  --name add-new-content-type
```

This will create a migration script in the `./migrations` folder with a numeric `order` property.

**Creating a Migration Script with Date Ordering**

```bash
npx @kontent-ai/data-ops@latest migrations add \
  --migrationsFolder ./migrations \
  --name update-taxonomy \
  --dateOrder
```

This will create a migration script named with the current UTC date and time, and the `order` property will be set to the corresponding date.

---

## Migrations Run

The `migrations run` command executes migration scripts against a Kontent.ai environment. You can specify a single migration script by file name or run multiple migration scripts in the order specified in their `order` properties.

### Usage

```bash
npx @kontent-ai/data-ops@latest migrations run \
  --migrationsFolder <path-to-folder> \
  --environmentId <environment-id> \
  --apiKey <Management-API-key> \
  [options]
```

To see all supported parameters, run:

```bash
npx @kontent-ai/data-ops@latest migrations run --help
```

### Parameters

| Parameter                | Description                                                                                                      |
|--------------------------|------------------------------------------------------------------------------------------------------------------|
| `--migrationsFolder`     | The path to the folder containing the migration scripts to run.                                                  |
| `--environmentId`        | The ID of the target Kontent.ai environment where the migrations will be executed.                               |
| `--apiKey`               | The Management API key for the target environment.                                                               |
| `--name`                 | (Optional) The name of a specific migration script file to run.                                                  |
| `--all`                  | (Optional) Runs all pending migrations in order.                                                                 |
| `--next`                 | (Optional) Runs the next pending migration script.                                                               |
| `--range`                | (Optional) Runs migrations within the specified range. Format: `(number|Tyyyy-mm-dd-hh-mm-ss):(number|Tyyyy-mm-dd-hh-mm-ss)` |
| `--rollback`, `-b`       | (Optional) Executes the `rollback` functions of the migration scripts instead of `run`.                          |
| `--force`                | (Optional) Forces the execution of migrations even if they have already been run.                                |
| `--configFile`           | (Optional) Path to a JSON configuration file containing parameters.                                              |

**Note**: If none of `--name`, `--all`, `--next`, or `--range` is specified, the command will prompt you to select a migration to run.

### Range Parameter Format

When using the `--range` option, provide a value in the form of `(number | Tyyyy-mm-dd-hh-mm-ss):(number | Tyyyy-mm-dd-hh-mm-ss)`.

- **Number Ordering**: Use integers to specify the range of migrations based on their numeric `order` values.
- **Date Ordering**: Use date strings prefixed with `T` to specify migrations based on their date `order` values. For example, `T2023-01-01:T2023-12-31`.
- **Partial Dates**: When using dates, only the year value is mandatory. Other values (month, day, hour, minute, second) are optional.
- **Combining Orders**: Number and date ranges can be combined if necessary.

### Example

**Running a Specific Migration Script**

```bash
npx @kontent-ai/data-ops@latest migrations run \
  --migrationsFolder ./migrations \
  --environmentId <environment-id> \
  --apiKey <Management-API-key> \
  --name add-new-content-type.js
```

**Running All Pending Migrations**

```bash
npx @kontent-ai/data-ops@latest migrations run \
  --migrationsFolder ./migrations \
  --environmentId <environment-id> \
  --apiKey <Management-API-key> \
  --all
```

**Running Migrations in a Range**

```bash
npx @kontent-ai/data-ops@latest migrations run \
  --migrationsFolder ./migrations \
  --environmentId <environment-id> \
  --apiKey <Management-API-key> \
  --range 1:5
```

**Running Rollback Scripts**

```bash
npx @kontent-ai/data-ops@latest migrations run \
  --migrationsFolder ./migrations \
  --environmentId <environment-id> \
  --apiKey <Management-API-key> \
  --name add-new-content-type.js \
  --rollback
```

### Using a Configuration File

As the command might get long, you can pass parameters in a JSON configuration file (e.g., `--configFile params.json`).

**`params.json` Example:**

```json
{
  "environmentId": "<environment-id>",
  "apiKey": "<Management-API-key>",
  "migrationsFolder": "./migrations"
}
```

Run the command with the configuration file:

```bash
npx @kontent-ai/data-ops@latest migrations run --configFile params.json --all
```

---

## Migrations Status

After each migration script is run, data-ops logs the execution information into a status file. This file tracks which migrations have been executed to prevent running the same migration script multiple times. By default, the `status.json` file is stored in the folder containing your migrations.

- **Skipping Executed Migrations**: The tool skips migrations that have already been executed. You can force the execution of migrations by using the `--force` parameter.
- **Single Record per Migration**: For each migration, there is only one record in the status file. Repeatedly running the same migration overrides that record with new data.

> **Note**
>
> If you need to customize where and how the migration status is stored, you can implement custom status plugins.

### Custom Implementation of Reading/Saving Migrations Status

You might want to implement your own method for storing and retrieving migration status instead of using the default `status.json` file. Data-ops provides an option to implement the functions `readStatus` and `saveStatus`.

#### Steps to Create Custom Status Plugins

1. **Create a Plugin Script**: Write a JavaScript or TypeScript file implementing the `readStatus` and `saveStatus` functions.

2. **Implement the Functions**:

   - **TypeScript Example (`plugins.ts`):**

     ```typescript
     // plugins.ts
     import type { ReadStatus, SaveStatus, Status } from "@kontent-ai/data-ops";

     export const saveStatus: SaveStatus = async (data: Status) => {
       // Implement your custom save logic here
     };

     export const readStatus: ReadStatus = async () => {
       // Implement your custom read logic here
       return []; // Return an array of migration status records
     };
     ```

   - **JavaScript Example (`plugins.js`):**

     ```javascript
     // plugins.js
     export const saveStatus = async (data) => {
       // Implement your custom save logic here
     };

     export const readStatus = async () => {
       // Implement your custom read logic here
       return []; // Return an array of migration status records
     };
     ```

3. **Transpile if Necessary**: If you're using TypeScript, don't forget to transpile your `.ts` file into a `.js` script. Otherwise, your plugins will not work.

4. **Provide the Plugin to the Command**: Use the `--plugins` parameter to specify the path to your plugin script.

   **Example:**

   ```bash
   npx @kontent-ai/data-ops@latest migrations run \
     --migrationsFolder ./migrations \
     --environmentId <environment-id> \
     --apiKey <Management-API-key> \
     --plugins ./plugins.js \
     --all
   ```

> **Important Notes:**
>
> - Both `readStatus` and `saveStatus` functions must be implemented.
> - Ensure your plugin script exports these functions correctly.
> - Handle any required data storage (e.g., database connections, file I/O) within your custom functions.

---

## Additional Notes

- **ES Modules Requirement**: Data-ops requires migration scripts and plugins to be ES Modules. Ensure your scripts are written in ES Module format or transpiled accordingly.
- **JavaScript Only**: The migration tools support only JavaScript files. If you write migrations in TypeScript, you must transpile them before running.
- **Execution Order**: Pay attention to the `order` property in your migration scripts to control the execution sequence.

---

By following these guidelines and understanding the migration commands, you can effectively manage and automate changes to your Kontent.ai environments, ensuring consistency and streamlining your content management workflows.