import { SharedModels } from "@kontent-ai/management-sdk";
import { isAxiosError } from "axios";

export const throwError = (msg: string) => {
  throw new Error(msg);
};

export const skipKontentErrors = (errorCodesToSkip: ReadonlyArray<number>) =>
  handleKontentErrors(e => {
    if (!errorCodesToSkip.includes(e.errorCode)) {
      throw e as unknown;
    }
    return undefined;
  });

const handleKontentErrors =
  <T>(handler: (error: SharedModels.ContentManagementBaseKontentError) => T) => (error: unknown) => {
    if (error instanceof SharedModels.ContentManagementBaseKontentError) {
      return handler({ ...error, originalError: simplifyAxiosErrors(error.originalError) });
    }

    throw simplifyAxiosErrors(error);
  };

export const simplifyErrors = handleKontentErrors(err => {
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
      requestHeaders: error.config?.headers.normalize(true).toJSON(),
      code: error.code,
    }
    : error;
