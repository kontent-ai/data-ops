import { type GroupedElementOps, countOps } from "../../utils/groupOperations.js";
import { ArrayChangesSection } from "./ArrayChangesSection.js";
import { MoveTable } from "./MoveTable.js";
import { PropertyDiffTable } from "./PropertyDiffTable.js";

type ElementNodeProps = Readonly<{
  codename: string;
  ops: GroupedElementOps;
}>;

export const ElementNode = ({ codename, ops }: ElementNodeProps) => {
  const counts = countOps(ops);

  return (
    <details className="element-node element-node--modified">
      <summary className="element-node-header">
        <span className="element-node-toggle">{"\u25B6"}</span>
        {codename}
        <span className="en-counts">
          {counts.adds > 0 && <span className="num-added">+{counts.adds}</span>}
          {counts.modifies > 0 && <span className="num-modified">~{counts.modifies}</span>}
          {counts.removes > 0 && <span className="num-removed">{"\u2212"}{counts.removes}</span>}
          {counts.moves > 0 && <span className="num-modified">{"\u21B7"}{counts.moves}</span>}
        </span>
      </summary>
      <div className="element-node-content">
        <PropertyDiffTable ops={ops} elementCodename={codename} />
        <ArrayChangesSection adds={ops.adds} removes={ops.removes} elementCodename={codename} />
        <MoveTable moves={ops.moves} elementCodename={codename} />
      </div>
    </details>
  );
};
