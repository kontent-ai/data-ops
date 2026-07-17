import { SharedModels } from "@kontent-ai/management-sdk";
import { isAxiosError } from "axios";
import chalk from "chalk";

import { InvalidKontentUrlError } from "./kontentUrl.js";

export const throwError = (msg: string) => {
  throw new Error(msg);
};

export const skipKontentErrors = (errorCodesToSkip: ReadonlyArray<number>) =>
  handleKontentErrors(() => undefined, errorCodesToSkip);

export const handleKontentErrors =
  <T>(
    handler: (error: SharedModels.ContentManagementBaseKontentError) => T,
    specificErrorCodes: ReadonlyArray<number> | null = null,
  ) =>
  (error: unknown) => {
    if (
      error instanceof SharedModels.ContentManagementBaseKontentError &&
      (specificErrorCodes === null || specificErrorCodes.includes(error.errorCode))
    ) {
      return handler({ ...error, originalError: simplifyAxiosErrors(error.originalError) });
    }

    throw simplifyAxiosErrors(error);
  };

const rethrowKontentErrors = handleKontentErrors((err) => {
  throw err as unknown;
});

export const simplifyErrors = (error: unknown) => {
  if (error instanceof InvalidKontentUrlError) {
    // eslint-disable-next-line no-restricted-syntax
    console.error(`${chalk.red("Error:")} ${error.message}\n`);
    process.exit(1);
  }

  return rethrowKontentErrors(error);
};

export const simplifyAxiosErrors = (error: unknown): unknown =>
  isAxiosError(error)
    ? {
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method,
        responseBody: error.response?.config.data,
        requestBody: error.config?.data,
        requestHeaders: error.config?.headers.normalize(true).toJSON(),
        code: error.code,
      }
    : error;
