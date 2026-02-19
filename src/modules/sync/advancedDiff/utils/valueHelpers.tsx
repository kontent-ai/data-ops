import type { ReactNode } from "react";
import {
  isCountLimitation,
  isDefaultElementValue,
  isDependsOn,
  isExternalIdReference,
  isExternalIdReferenceArray,
  isMaximumTextLength,
  isObjectReference,
  isObjectReferenceArray,
  isValidationRegex,
} from "../../../../utils/typeguards.js";
import { renderRichTextValue } from "./richTextResolvers.js";

const renderValueOrIdentifierInternal = (value: unknown): ReactNode | ReadonlyArray<ReactNode> => {
  if (Array.isArray(value)) {
    return value.flatMap(renderValueOrIdentifierInternal);
  }

  if (typeof value !== "object" || value === null) {
    return <strong>{String(value)}</strong>;
  }

  const valueObj = value as Record<string, unknown>;

  if (typeof valueObj.codename === "string") {
    return <strong>{valueObj.codename}</strong>;
  }

  if (typeof valueObj.id === "string") {
    return <strong>{valueObj.id}</strong>;
  }

  if ("value" in valueObj) {
    return renderValueOrIdentifierInternal(valueObj.value);
  }

  if ("global" in valueObj) {
    return renderValueOrIdentifierInternal(valueObj.global);
  }

  if (typeof valueObj.regex === "string") {
    return <strong>{valueObj.regex}</strong>;
  }

  if ("step" in valueObj) {
    return renderValueOrIdentifierInternal(valueObj.step);
  }

  if ("scope" in valueObj) {
    return renderValueOrIdentifierInternal(valueObj.scope);
  }

  if ("content_types" in valueObj && "collections" in valueObj) {
    const types = renderValueOrIdentifier(valueObj.content_types);
    const collections = renderValueOrIdentifier(valueObj.collections);
    return (
      <>
        types: {types}, collections: {collections}
      </>
    );
  }

  if ("collections" in valueObj) {
    return renderValueOrIdentifierInternal(valueObj.collections);
  }

  return <strong>{String(value)}</strong>;
};

const joinReactNodes = (nodes: ReadonlyArray<ReactNode>): ReactNode =>
  nodes.map((node, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: Static list, never reordered
    <span key={i}>
      {i > 0 && ", "}
      {node}
    </span>
  ));

export const renderValueOrIdentifier = (value: unknown): ReactNode => {
  const result = renderValueOrIdentifierInternal(value);
  return Array.isArray(result) ? joinReactNodes(result) : result;
};

export const renderReplaceOpValue = (value: unknown): ReactNode => {
  switch (typeof value) {
    case "string":
      return renderRichTextValue(value);
    case "boolean":
    case "number":
      return String(value);
    case "object":
      if (value === null) {
        return "null";
      }
      if (isCountLimitation(value)) {
        return `${value.condition}: ${value.value}`;
      }
      if (isObjectReference(value)) {
        return value.codename;
      }
      if (isObjectReferenceArray(value)) {
        return value.map((r) => r.codename).join(", ");
      }
      if (isExternalIdReference(value)) {
        return value.external_id;
      }
      if (isExternalIdReferenceArray(value)) {
        return value.map((r) => r.external_id).join(", ");
      }
      if (isDependsOn(value)) {
        return `${value.element.codename} ${value.snippet?.codename ? `of snippet ${value.snippet.codename}` : ""}`;
      }
      if (isDefaultElementValue(value)) {
        return renderReplaceOpValue(value.global.value);
      }
      if (isMaximumTextLength(value)) {
        return `${value.value} ${value.applies_to}`;
      }
      if (isValidationRegex(value)) {
        return JSON.stringify(value, null, 2);
      }
      return renderValueOrIdentifier(value);
    default:
      return String(value);
  }
};

export const emptyAllowsAllProperties: ReadonlyArray<string> = [
  "allowed_content_types",
  "allowed_item_link_types",
  "allowed_blocks",
  "allowed_text_blocks",
  "allowed_formatting",
  "allowed_table_blocks",
  "allowed_table_text_blocks",
  "allowed_table_formatting",
];
