import { CommandModule } from "yargs";

import { LogOptions } from "../log.js";

export type StandaloneCommandModule<T = {}, U = {}> = MakeRequired<CommandModule<T, U>, "command" | "describe">;

type MakeRequired<T, Keys extends keyof T> = Omit<T, Keys> & Required<Pick<T, Keys>>;

export type RegisterCommand = <Result, InitialParams extends LogOptions = LogOptions>(
  obj: Readonly<
    {
      command: <CommandParams extends InitialParams = InitialParams>(
        cmdModule: StandaloneCommandModule<InitialParams, CommandParams>,
      ) => Result;
    }
  >,
) => Result;
