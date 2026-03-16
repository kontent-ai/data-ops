import type { ReactNode } from "react";

import { emptyAllowsAllProperties, renderValueOrIdentifier } from "../../../utils/valueHelpers.js";

type AddedObjectPropertiesProps = Readonly<{
  object: object;
}>;

const renderPropertyValue = (property: string, value: unknown): ReactNode => {
  const allowsAll =
    emptyAllowsAllProperties.includes(property) && Array.isArray(value) && value.length === 0;

  if (allowsAll) {
    return <strong>all</strong>;
  }

  return renderValueOrIdentifier(value);
};

export const AddedObjectProperties = ({ object }: AddedObjectPropertiesProps) => (
  <table className="detail-props-table">
    <tbody>
      {Object.entries(object).map(([property, value]) => (
        <tr key={property}>
          <td className="prop-name">{property}</td>
          <td>{renderPropertyValue(property, value)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
