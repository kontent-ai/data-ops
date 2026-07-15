import { SharedModels } from "@kontent-ai/management-sdk";
import { isAxiosError } from "axios";

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

export const simplifyErrors = handleKontentErrors((err) => {
  throw err as unknown;
});

export const simplifyAxiosErrors = (error: unknown): unknown =>
  isAxiosError(error)
    ? {
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method,
        responseBody: error.response?.config.data,
        requestBody: error.config?.data,
        requestHeaders: redactSecrets(error.config?.headers.normalize(true).toJSON()),
        code: error.code,
      }
    : error;

/**
 * A `JSON.stringify` replacer that masks credential values at any depth. Pass it to every sink that
 * serializes a raw error, whose nested request headers would otherwise expose the bearer token.
 */
export const redactingReplacer = (key: string, value: unknown): unknown =>
  secretKeyPattern.test(key) ? redactedValue : value;

const redactedValue = "***redacted***";

const secretKeyPattern = /authorization|api[-_]?key/i;

const redactSecrets = (headers: unknown): unknown =>
  headers && typeof headers === "object"
    ? Object.fromEntries(
        Object.entries(headers).map(([key, value]) => [
          key,
          secretKeyPattern.test(key) ? redactedValue : value,
        ]),
      )
    : headers;
