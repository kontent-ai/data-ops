import type { ReactNode } from "react";

import type { AddIntoPatchOperation, RemovePatchOperation } from "../../../types/patchOperation.js";
import {
  extractPropertyPath,
  formatPropertyName,
  getRemoveArrayProperty,
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
  const grouped = adds.reduce<Map<string, ReadonlyArray<AddIntoPatchOperation>>>(
    (acc, op) => {
      const property = extractPropertyPath(op.path, elementCodename);
      return new Map([...acc, [property, [...(acc.get(property) ?? []), op]]]);
    },
    new Map(),
  );

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
  const grouped = removes.reduce<Map<string, ReadonlyArray<RemovePatchOperation>>>(
    (acc, op) => {
      const property = getRemoveArrayProperty(op.path, elementCodename);
      return new Map([...acc, [property, [...(acc.get(property) ?? []), op]]]);
    },
    new Map(),
  );

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

  for (const g of addGroups) {
    rowMap.set(g.property, {
      property: g.property,
      displayName: g.displayName,
      adds: g.ops,
      removes: [],
    });
  }

  for (const g of removeGroups) {
    const existing = rowMap.get(g.property);
    rowMap.set(g.property, {
      property: g.property,
      displayName: existing?.displayName ?? g.displayName,
      adds: existing?.adds ?? [],
      removes: g.ops,
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

export const ArrayChangesSection = ({ adds, removes, elementCodename }: ArrayChangesSectionProps) => {
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
              <td className="prop-name">{renderTaxonomyPropertyPath(row.property) ?? row.displayName}</td>
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
