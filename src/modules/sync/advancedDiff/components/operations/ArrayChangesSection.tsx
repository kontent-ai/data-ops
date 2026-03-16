import type { ReactNode } from "react";

import type {
  AddIntoPatchOperation,
  PatchOperation,
  RemovePatchOperation,
} from "../../../types/patchOperation.js";
import {
  formatPropertyName,
  getRemoveArrayProperty,
  stripElementPrefix,
} from "../../utils/groupOperations.js";
import { renderTaxonomyPropertyPath } from "../../utils/pathRenderers.js";
import { renderValueOrIdentifier } from "../../utils/valueHelpers.js";

type ArrayChangesSectionProps = Readonly<{
  adds: ReadonlyArray<AddIntoPatchOperation>;
  removes: ReadonlyArray<RemovePatchOperation>;
  elementCodename?: string;
}>;

type ArrayPropertyGroup<T> = Readonly<{
  property: string;
  displayName: string;
  ops: ReadonlyArray<T>;
}>;

type MergedArrayRow = Readonly<{
  property: string;
  displayName: string;
  adds: ReadonlyArray<AddIntoPatchOperation>;
  removes: ReadonlyArray<RemovePatchOperation>;
}>;

const groupOpsByProperty = <T extends PatchOperation>(
  ops: ReadonlyArray<T>,
  getProperty: (op: T) => string,
): ReadonlyArray<ArrayPropertyGroup<T>> =>
  [...Map.groupBy(ops, getProperty)].map(([property, ops]) => ({
    property,
    displayName: formatPropertyName(property),
    ops,
  }));

const mergeGroups = (
  addGroups: ReadonlyArray<ArrayPropertyGroup<AddIntoPatchOperation>>,
  removeGroups: ReadonlyArray<ArrayPropertyGroup<RemovePatchOperation>>,
): ReadonlyArray<MergedArrayRow> => {
  const all = [
    ...addGroups.map((g) => ({ ...g, kind: "add" as const })),
    ...removeGroups.map((g) => ({ ...g, kind: "remove" as const })),
  ];

  return [...Map.groupBy(all, (g) => g.property)].map(([property, groups]) => ({
    property,
    displayName: formatPropertyName(property),
    adds: groups.filter((g) => g.kind === "add").flatMap((g) => g.ops),
    removes: groups.filter((g) => g.kind === "remove").flatMap((g) => g.ops),
  }));
};

const renderAddValues = (ops: ReadonlyArray<AddIntoPatchOperation>): ReactNode =>
  ops.map((op, i) => (
    <span key={`add-${op.path}-${i}`}>
      {i > 0 && ", "}
      {renderValueOrIdentifier(op.value)}
    </span>
  ));

const renderRemoveValues = (ops: ReadonlyArray<RemovePatchOperation>): ReactNode =>
  ops.map((op, i) => (
    <span key={`rm-${op.path}-${i}`}>
      {i > 0 && ", "}
      {renderValueOrIdentifier(op.oldValue)}
    </span>
  ));

export const ArrayChangesSection = ({
  adds,
  removes,
  elementCodename,
}: ArrayChangesSectionProps) => {
  const addGroups = groupOpsByProperty(adds, (op) => stripElementPrefix(op.path, elementCodename));
  const removeGroups = groupOpsByProperty(removes, (op) =>
    getRemoveArrayProperty(op.path, elementCodename),
  );

  if (addGroups.length === 0 && removeGroups.length === 0) {
    return null;
  }

  const rows = mergeGroups(addGroups, removeGroups);

  return (
    <div className="array-changes">
      <div className="array-changes-label">Array properties changes</div>
      <table className="array-changes-table">
        <thead>
          <tr>
            <th>Property</th>
            <th>Removed</th>
            <th>Added</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.property}>
              <td className="prop-name">
                {renderTaxonomyPropertyPath(row.property) ?? row.displayName}
              </td>
              <td className="array-values array-values--removed">
                {row.removes.length > 0 ? renderRemoveValues(row.removes) : "-"}
              </td>
              <td className="array-values array-values--added">
                {row.adds.length > 0 ? renderAddValues(row.adds) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
