import type { ContentTypeElements } from "@kontent-ai/management-sdk";

import { renderRichTextValue } from "../../../utils/richTextResolvers.js";
import { emptyAllowsAllProperties, renderValueOrIdentifier } from "../../../utils/valueHelpers.js";

type AddedElementsTableProps = Readonly<{
  elements: ReadonlyArray<ContentTypeElements.Element>;
}>;

const tableExcludedProperties = new Set([
  "codename",
  "type",
  "is_required",
  "content_group",
  "is_non_localizable",
  "name",
]);

const renderDetailProperties = (element: ContentTypeElements.Element) =>
  Object.entries(element)
    .filter(([key]) => !tableExcludedProperties.has(key))
    .map(([property, value]) => {
      const allowsAll =
        emptyAllowsAllProperties.includes(property) && Array.isArray(value) && value.length === 0;

      const renderedValue =
        property === "guidelines" && typeof value === "string" ? (
          renderRichTextValue(value)
        ) : allowsAll ? (
          <strong>all</strong>
        ) : (
          renderValueOrIdentifier(value)
        );

      return (
        <tr key={property}>
          <td className="prop-name">{property}</td>
          <td>{renderedValue}</td>
        </tr>
      );
    });

export const AddedElementsTable = ({ elements }: AddedElementsTableProps) => (
  <div className="elements-grid">
    <div className="elements-grid-header">
      <div>Codename</div>
      <div>Type</div>
      <div>Required</div>
      <div>Content group</div>
    </div>
    {elements.map((element) => {
      const contentGroupCodename = element.content_group?.codename;
      const isRequired = (element as unknown as Record<string, unknown>).is_required === true;
      const detailProps = renderDetailProperties(element);

      return (
        <details key={element.codename} className="elements-grid-row">
          <summary>
            <div>{element.codename}</div>
            <div>
              <span className="type-badge">{element.type.replaceAll("_", " ")}</span>
            </div>
            <div>{isRequired ? "true" : "\u2014"}</div>
            <div>{contentGroupCodename ?? "\u2014"}</div>
          </summary>
          {detailProps.length > 0 && (
            <div className="elements-grid-detail">
              <table className="detail-props-table">
                <tbody>{detailProps}</tbody>
              </table>
            </div>
          )}
        </details>
      );
    })}
  </div>
);
