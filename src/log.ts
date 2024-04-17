import chalk from "chalk";
import { Argv } from "yargs";

export type LogLevel =
  | "none"
  | "standard"
  | "verbose";

const logLevelsPriority: Readonly<Record<LogLevel, number>> = {
  none: 0,
  standard: 10,
  verbose: 20,
};

export const allLogLevels = Object.keys(logLevelsPriority);

type LoggableLogLevel = Exclude<LogLevel, "none">;

export const logError = (options: LogOptions, ...messages: ReadonlyArray<string>) =>
  logInternal(options, "standard", console.error, ...messages.map(m => `${chalk.red("Error:")} ${m}`));

export const logWarning = (
  options: LogOptions,
  logAtLevel: LoggableLogLevel,
  ...messages: ReadonlyArray<string>
) => logInternal(options, logAtLevel, console.warn, ...messages);

export const logInfo = (
  options: LogOptions,
  logAtLevel: LoggableLogLevel,
  ...messages: ReadonlyArray<string>
) => logInternal(options, logAtLevel, console.log, ...messages);

const logInternal = (
  options: LogOptions,
  thisMessageLogLevel: LoggableLogLevel,
  logFnc: (...msgs: ReadonlyArray<string>) => void,
  ...messages: ReadonlyArray<string>
) => {
  if (logLevelsPriority[optionsToLogLevel(options)] >= logLevelsPriority[thisMessageLogLevel]) {
    logFnc(...messages);
  }
};

const optionsToLogLevel = (options: LogOptions): LogLevel => {
  if (options.verbose) {
    return "verbose";
  }

  const logLevel = options.logLevel || defaultLogLevel;
  if (!isLogLevel(logLevel)) {
    throw new Error(
      `There was an error in CLI arguments parsing. Log level "${options.logLevel}" is not a valid log level.`,
    );
  }

  return logLevel;
};

const isLogLevel = (input: string): input is LogLevel => allLogLevels.includes(input);

export type LogOptions = Readonly<{
  logLevel?: string;
  verbose?: boolean;
}>;

const defaultLogLevel: LogLevel = "standard";

export const addLogLevelOptions = <PreviousOptions>(inputYargs: Argv<PreviousOptions>): Argv<LogOptions> =>
  inputYargs
    .option("logLevel", {
      type: "string",
      choices: allLogLevels,
      alias: "ll",
      describe: `Set the level of details you want to be printed. (default: ${defaultLogLevel})`,
    })
    .option("verbose", {
      type: "boolean",
      describe: "Set the log level to verbose. (alias for --logLevel=verbose)",
      conflicts: "logLevel",
    });
