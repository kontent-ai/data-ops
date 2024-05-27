import { SharedModels } from "@kontent-ai/management-sdk";

import { spotlightInUseErrorCode } from "../constants/responseCodes.js";
import { ContentTypeModels, ContentTypeSnippetModels, TaxonomyModels } from "@kontent-ai/management-sdk";

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
