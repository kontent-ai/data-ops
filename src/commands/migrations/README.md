# Migrations

Migration commands offer tools to write and execute migration scripts for managing Kontent.ai environments using the Management API.

> [!NOTE] 
> The data-ops migration tools support only JavaScript files. Therefore, if you write your migrations in TypeScript or any other language, you must transpile your code before running it.

> [!CAUTION]
> Data-ops can only work with ES Modules. Ensure you use ES .js scripts or transpile your .ts files into ES Modules.

Migrations consist of these commands: 
- [add](./add/README.md)
- [run](./run/README.md)