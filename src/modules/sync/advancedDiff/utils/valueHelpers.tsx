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

const getValueOrIdentifierInternal = (value: unknown): ReactNode | ReadonlyArray<ReactNode> => {
  if (Array.isArray(value)) {
    return value.flatMap(getValueOrIdentifierInternal);
  }

  if (typeof value === "object" && value !== null) {
    const valueObj = value as Record<string, unknown>;

    if (typeof valueObj.codename === "string") {
      return <strong>{valueObj.codename}</strong>;
    }

    if (typeof valueObj.id === "string") {
      return <strong>{valueObj.id}</strong>;
    }

    if ("value" in valueObj) {
      return getValueOrIdentifierInternal(valueObj.value);
    }

    if ("global" in valueObj) {
      return getValueOrIdentifierInternal(valueObj.global);
    }

    if (typeof valueObj.regex === "string") {
      return <strong>{valueObj.regex}</strong>;
    }

    if ("step" in valueObj) {
      return getValueOrIdentifierInternal(valueObj.step);
    }

    if ("scope" in valueObj) {
      return getValueOrIdentifierInternal(valueObj.scope);
    }

    if ("content_types" in valueObj && "collections" in valueObj) {
      const types = getValueOrIdentifier(valueObj.content_types);
      const collections = getValueOrIdentifier(valueObj.collections);
      return (
        <>
          types: {types}, collections: {collections}
        </>
      );
    }

    if ("collections" in valueObj) {
      return getValueOrIdentifierInternal(valueObj.collections);
    }
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

export const getValueOrIdentifier = (value: unknown): ReactNode => {
  const result = getValueOrIdentifierInternal(value);
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
        return (
          <>
            <p>
              <strong>Regex:</strong> {value.regex}
            </p>
            <p>
              <strong>Flags:</strong> {value.flags ?? "—"}
            </p>
            <p>
              <strong>IsActive:</strong> {value.is_active || "—"}
            </p>
            <p>
              <strong>Validation message:</strong> {value.validation_message ?? "—"}
            </p>
          </>
        );
      }
      return getValueOrIdentifier(value);
    default:
      return value === null ? "null" : String(value);
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
