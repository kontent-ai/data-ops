import { EnvironmentModels } from "@kontent-ai/management-sdk";
import chalk from "chalk";

export const formatEnvironmentInformation = (envInfo: EnvironmentModels.EnvironmentInformationModel) =>
  `${chalk.bold.magenta(envInfo.name)} ${chalk.bold.blue(`${envInfo.environment} (${envInfo.id})`)}`;
