import { ContentTypeElements, ContentTypeSnippetContracts } from "@kontent-ai/management-sdk";

import { Replace } from "../../../utils/types.js";

export type SnippetElement = Exclude<
  ContentTypeElements.Element,
  ContentTypeElements.IUrlSlugElement | ContentTypeElements.ISnippetElement | ContentTypeElements.ISubpagesElement
>;

export type ContentTypeSnippetsWithUnionElements = Replace<
  ContentTypeSnippetContracts.IContentTypeSnippetContract,
  "elements",
  SnippetElement[]
>;
