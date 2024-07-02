import { ContentTypeModels, ContentTypeSnippetModels, SharedModels, TaxonomyModels } from "@kontent-ai/management-sdk";

import { spotlightInUseErrorCode } from "../constants/responseCodes.js";
import {
  CountLimitation,
  DefaultElementValue,
  DependsOn,
  ExternalIdReference,
  MaximumTextLength,
  ObjectReference,
  ValidationRegex,
} from "../modules/sync/types/patchOperation.js";

export const notNull = <T>(arg: T | null): arg is T => arg !== null;

export const notNullOrUndefined = <T>(arg: T | undefined | null): arg is T => arg !== undefined && arg !== null;

export const isSpotlightInUseError = (err: any): err is SharedModels.ContentManagementBaseKontentError =>
  err.errorCode === spotlightInUseErrorCode;
export const isTaxonomyRequestModel = (obj: any): obj is TaxonomyModels.IAddTaxonomyRequestModel => {
  return obj && Array.isArray(obj.terms);
};

export const isContentTypeData = (obj: any): obj is ContentTypeModels.IAddContentTypeData => {
  return obj && Array.isArray(obj.content_groups);
};

export const isContentTypeSnippetData = (obj: any): obj is ContentTypeSnippetModels.IAddContentTypeSnippetData => {
  return obj && "codename" in obj && !isTaxonomyRequestModel(obj) && !isContentTypeData(obj);
};

export const isCountLimitation = (obj: any): obj is CountLimitation =>
  obj
  && "value" in obj
  && "condition" in obj
  && Object.keys(obj).length === 2;

export const isObjectReference = (obj: any): obj is ObjectReference =>
  obj
  && "codename" in obj;

export const isObjectReferenceArray = (obj: any): obj is ObjectReference[] =>
  Array.isArray(obj) && obj.every(isObjectReference);

export const isDependsOn = (obj: any): obj is DependsOn =>
  obj
  && isObjectReference(obj.element)
  && (obj.snippet === undefined || isObjectReference(obj.snippet));

export const isDefaultValue = (obj: any): obj is DefaultElementValue => obj && "global" in obj && "value" in obj.global;

export const isMaximumTextLength = (obj: any): obj is MaximumTextLength =>
  obj && "value" in obj && "applies_to" in obj && typeof obj.value === "number";

export const isValidationRegex = (obj: any): obj is ValidationRegex => obj && "regex" in obj;

export const isExternalIdReference = (obj: any): obj is ExternalIdReference => obj && "external_id" in obj;

export const isExternalIdReferenceArray = (obj: any): obj is ExternalIdReference[] =>
  Array.isArray(obj) && obj.every(isExternalIdReference);
