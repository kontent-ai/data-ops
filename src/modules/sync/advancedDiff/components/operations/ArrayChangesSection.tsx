import type { ReactNode } from "react";

import type { AddIntoPatchOperation, RemovePatchOperation } from "../../../types/patchOperation.js";
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

const groupAddsByProperty = (
  adds: ReadonlyArray<AddIntoPatchOperation>,
  elementCodename?: string,
): ReadonlyArray<ArrayPropertyGroup<AddIntoPatchOperation>> => {
  const grouped = adds.reduce<Map<string, AddIntoPatchOperation[]>>((acc, op) => {
    const property = stripElementPrefix(op.path, elementCodename);
    const propertyOps = acc.get(property) ?? [];
    propertyOps.push(op);
    acc.set(property, propertyOps);
    return acc;
  }, new Map());

  return [...grouped.entries()].map(([property, ops]) => ({
    property,
    displayName: formatPropertyName(property),
    ops,
  }));
};

const groupRemovesByProperty = (
  removes: ReadonlyArray<RemovePatchOperation>,
  elementCodename?: string,
): ReadonlyArray<ArrayPropertyGroup<RemovePatchOperation>> => {
  const grouped = removes.reduce<Map<string, RemovePatchOperation[]>>((acc, op) => {
    const property = getRemoveArrayProperty(op.path, elementCodename);
    const propertyOps = acc.get(property) ?? [];
    propertyOps.push(op);
    acc.set(property, propertyOps);
    return acc;
  }, new Map());

  return [...grouped.entries()].map(([property, ops]) => ({
    property,
    displayName: formatPropertyName(property),
    ops,
  }));
};

const mergeGroups = (
  addGroups: ReadonlyArray<ArrayPropertyGroup<AddIntoPatchOperation>>,
  removeGroups: ReadonlyArray<ArrayPropertyGroup<RemovePatchOperation>>,
): ReadonlyArray<MergedArrayRow> => {
  const rowMap = new Map<string, MergedArrayRow>();

  for (const addGroup of addGroups) {
    rowMap.set(addGroup.property, {
      property: addGroup.property,
      displayName: addGroup.displayName,
      adds: addGroup.ops,
      removes: [],
    });
  }

  for (const removeGroup of removeGroups) {
    const existing = rowMap.get(removeGroup.property);
    rowMap.set(removeGroup.property, {
      property: removeGroup.property,
      displayName: existing?.displayName ?? removeGroup.displayName,
      adds: existing?.adds ?? [],
      removes: removeGroup.ops,
    });
  }

  return [...rowMap.values()];
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
  const addGroups = groupAddsByProperty(adds, elementCodename);
  const removeGroups = groupRemovesByProperty(removes, elementCodename);

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
