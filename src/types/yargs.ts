import { CommandModule } from "yargs";

export type StandaloneCommandModule<T = {}, U = {}> = MakeRequired<CommandModule<T, U>, "command" | "describe">;

type MakeRequired<T, Keys extends keyof T> = Omit<T, Keys> & Required<Pick<T, Keys>>;

export type RegisterCommand = <Result, T>(
  obj: Readonly<{ command: <CommandParams>(cmdModule: StandaloneCommandModule<T, CommandParams>) => Result }>,
) => Result;
