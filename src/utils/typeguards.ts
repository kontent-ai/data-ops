import { SharedModels } from "@kontent-ai/management-sdk";
import { spotlightInUseErrorCode } from "../constants/responseCodes.js";
export const notNull = <T>(arg: T | null): arg is T => arg !== null;

export const notNullOrUndefined = <T>(arg: T | undefined | null): arg is T => arg !== undefined && arg !== null;

export const isSpotlightInUseError = (err: any): err is SharedModels.ContentManagementBaseKontentError =>
  err.errorCode === spotlightInUseErrorCode;
