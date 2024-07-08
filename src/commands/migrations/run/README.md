# Migrations run

Runs a migration script specified by file name (option --name `<filename>`), or runs multiple migration scripts in the order specified in the migration files (options --all, --range or --next).

By adding `--range`, you need to provide a value in the form of `(number | Tyyyy-mm-dd-hh-mm-ss):(number | Tyyyy-mm-dd-hh-mm-ss)`. When using a range with dates, only the year value is mandatory; all other values are optional. Note the `"T"` at the beginning of the date range, which helps to separate date and number ordering.

To execute `rollback` scripts instead of run scripts, use the `--rollback` option or the shorthand `-b`.

## Usage
```bash
npx @kontent-ai/data-ops migrations run --migrationsFolder <path-to-folder> --environmentId <env-id> --apiKey <mapi-key>
```
To see all supported parameters, run `npx @kontent-ai/data-ops migration run --help`
  
As the command might get long, we recommend passing parameters in a JSON configuration file (e.g. --configFile params.json)
```JSON
// params.json example
{
  "environmentId": "<env-id>",
  "apiKey": "<mapi-key>",
  "migrationsFolder": "<path-to-folder>"
}
```

## Migrations Status
After each migration script is run, the data-ops logs the execution information into a status file. This file saves data for future runs to prevent the same migration script from executing multiple times. You can ignore skipping migrations by using the --force parameter. 

>[!NOTE]
> By default, the `status.json` is stored in the folder containing your migrations. 
> You can override this behaviour by creating your own [status plugins.](#custom-implementation-of-readingsaving-migrations-status) 

> [!NOTE] 
> For each migration, there is only one record in the status file. Repeatedly calling same migration overrides that record with new data.

### Custom implementation of reading/saving migrations status

You might want to implement your own method for storing and retrieving migration status instead of using the default JSON file. In this case, data-ops provides an option to implement the functions `readStatus` and `saveStatus`. To use your own plugins, provide a path to the `.js` script implementing these functions.  We have prepared the types SaveStatus and ReadStatus for implementing in TypeScript. To create plugins in TypeScript, create a file named plugins.ts and implement your functions there. You can use the template below to fit the required declarations::

```ts
//plugins.ts
import type { ReadStatus, SaveStatus } from "@kontent-ai/data-ops";

export const saveStatus: SaveStatus = async (data: Status) => {}

export const readStatus: ReadStatus = async () => {}
```

> [!NOTE] 
> Both functions must be implemented.

> [!NOTE] 
> Don't forget to transpile your .ts file into .js script. Otherwise, your plugins will not work.

If you prefer not to use TypeScript, you can also write your script directly in JavaScript:

```js
//plugins.js
export const saveStatus = async (data) => {}

export const readStatus = async () => {}
``` 





