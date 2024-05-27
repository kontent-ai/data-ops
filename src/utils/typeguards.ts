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

export const isSpotlightInUseError = (
  err: unknown,
): err is SharedModels.ContentManagementBaseKontentError =>
  err !== null
  && typeof err === "object"
  && "errorCode" in err
  && typeof err.errorCode === "number"
  && err.errorCode === spotlightInUseErrorCode;

export const isTaxonomyData = (
  obj: unknown,
): obj is TaxonomyModels.IAddTaxonomyRequestModel =>
  obj !== null
  && typeof obj === "object"
  && "terms" in obj
  && Array.isArray(obj.terms);

export const isContentTypeData = (
  obj: unknown,
): obj is ContentTypeModels.IAddContentTypeData =>
  obj !== null
  && typeof obj === "object"
  && "content_groups" in obj
  && Array.isArray(obj.content_groups);

export const isContentTypeSnippetData = (
  obj: unknown,
): obj is ContentTypeSnippetModels.IAddContentTypeSnippetData =>
  obj !== null
  && typeof obj === "object"
  && "codename" in obj
  && typeof obj.codename === "string"
  && !isTaxonomyData(obj)
  && !isContentTypeData(obj);

export const isCountLimitation = (obj: unknown): obj is CountLimitation =>
  obj !== null
  && typeof obj === "object"
  && "value" in obj
  && typeof obj.value === "number"
  && "condition" in obj
  && typeof obj.condition === "string"
  && Object.keys(obj).length === 2;

export const isObjectReference = (obj: unknown): obj is ObjectReference =>
  obj !== null
  && typeof obj === "object"
  && "codename" in obj
  && typeof obj.codename === "string";

export const isObjectReferenceArray = (
  obj: unknown,
): obj is ObjectReference[] => Array.isArray(obj) && obj.every(isObjectReference);

export const isDependsOn = (obj: unknown): obj is DependsOn =>
  obj !== null
  && typeof obj === "object"
  && "element" in obj
  && "snippet" in obj
  && isObjectReference(obj.element)
  && (obj.snippet === undefined || isObjectReference(obj.snippet));

export const isDefaultValue = (obj: unknown): obj is DefaultElementValue =>
  obj !== null
  && typeof obj === "object"
  && "global" in obj
  && obj.global !== null
  && typeof obj.global === "object"
  && "value" in obj.global;

export const isMaximumTextLength = (obj: unknown): obj is MaximumTextLength =>
  obj !== null
  && typeof obj === "object"
  && "value" in obj
  && "applies_to" in obj
  && typeof obj.value === "number"
  && (obj.applies_to === "words" || obj.applies_to === "characters");

export const isValidationRegex = (obj: unknown): obj is ValidationRegex =>
  obj !== null
  && typeof obj === "object"
  && "regex" in obj
  && typeof obj.regex === "string";

export const isExternalIdReference = (
  obj: unknown,
): obj is ExternalIdReference =>
  obj !== null
  && typeof obj === "object"
  && "external_id" in obj
  && typeof obj.external_id === "string";

export const isExternalIdReferenceArray = (
  obj: unknown,
): obj is ExternalIdReference[] => Array.isArray(obj) && obj.every(isExternalIdReference);
