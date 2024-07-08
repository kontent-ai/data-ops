# Migrations add

Creates a Kontent.ai migration script file (in JavaScript or TypeScript) containing a module object with three properties: 
- `run` - Implement this function to execute the migration script using the Kontent.ai Management SDK, which is provided via the client parameter.
- `rollback` (optional) - Develop this function to reverse the changes made by the migration, if necessary.
- `order` - This property determines the sequence in which a batch of migrations (range, all, or next) is executed. The order can be specified as either a number or a date.

## Usage
```bash
npx @kontent-ai/data-ops migrations add --migrationsFolder <path-to-folder> --name <migration-name>
```
To see all supported parameters, run `npx @kontent-ai/data-ops migration add --help`

## Ordering rules
- Ordering by number takes precedence over ordering by dates. When executing multiple migrations, those with number-based orders will run first, followed by those with date-based orders.
- The order must be a unique positive integer or zero. 
- There may be gaps between migrations, for example, the following sequence is perfectly fine 0,3,4,5,10
- To use date ordering, utilize the switch option -d. The CLI will generate a new file named with the date in UTC format and the specified name. Additionally, the order property within the file will be set to the corresponding date.
- Number and date orders can be combined within a migrations folder.