import type { GroupedElementOps } from "../../utils/groupOperations.js";
import { formatPropertyName, stripElementPrefix } from "../../utils/groupOperations.js";
import { renderTaxonomyPropertyPath } from "../../utils/pathRenderers.js";
import { renderReplaceOpValue } from "../../utils/valueHelpers.js";

type PropertyDiffTableProps = Readonly<{
  ops: GroupedElementOps;
  elementCodename?: string;
}>;

export const PropertyDiffTable = ({ ops, elementCodename }: PropertyDiffTableProps) => {
  if (ops.replaces.length === 0) {
    return null;
  }

  return (
    <table className="prop-diff-table">
      <thead>
        <tr>
          <th>Property</th>
          <th>Before</th>
          <th>After</th>
        </tr>
      </thead>
      <tbody>
        {ops.replaces.map((op, i) => {
          const property = stripElementPrefix(op.path, elementCodename);
          return (
            <tr key={`replace-${op.path}-${i}`}>
              <td className="prop-name">
                {renderTaxonomyPropertyPath(property) ?? formatPropertyName(property)}
              </td>
              <td className="prop-old">{renderReplaceOpValue(op.oldValue)}</td>
              <td className="prop-new">{renderReplaceOpValue(op.value)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
