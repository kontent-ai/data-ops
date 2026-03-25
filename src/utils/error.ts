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

const formatKontentError = (err: SharedModels.ContentManagementBaseKontentError): string => {
  const parts = [
    `Kontent.ai API error ${err.errorCode}: ${err.message}`,
    `Request ID: ${err.requestId}`,
  ];

  if (err.validationErrors.length) {
    parts.push(
      "Validation errors:",
      ...err.validationErrors.map((ve) => `  - ${ve.message}`),
    );
  }

  return parts.join("\n");
};

const ensureError = (error: unknown): Error =>
  error instanceof Error
    ? error
    : new Error(typeof error === "string" ? error : JSON.stringify(error, null, 2));

export const simplifyErrors = (error: unknown): never => {
  if (error instanceof SharedModels.ContentManagementBaseKontentError) {
    const simplified = new Error(formatKontentError(error));
    simplified.cause = simplifyAxiosErrors(error.originalError);
    throw simplified;
  }

  throw ensureError(simplifyAxiosErrors(error));
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
