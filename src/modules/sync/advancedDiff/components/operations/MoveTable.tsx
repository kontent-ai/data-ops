import type { MovePatchOperation } from "../../../types/patchOperation.js";
import { stripElementPrefix } from "../../utils/groupOperations.js";
import { elementMovePathRenderers, moveEntityPathRenderers, renderEntityPath } from "../../utils/pathRenderers.js";

type MoveTableProps = Readonly<{
  moves: ReadonlyArray<MovePatchOperation>;
  elementCodename?: string;
}>;

const getMovePosition = (op: MovePatchOperation): { position: "after" | "before" | "under"; codename: string } =>
  "after" in op
    ? { position: "after", codename: op.after.codename }
    : "before" in op
      ? { position: "before", codename: op.before.codename }
      : { position: "under", codename: op.under.codename };

export const MoveTable = ({ moves, elementCodename }: MoveTableProps) => {
  if (moves.length === 0) {
    return null;
  }

  const renderers = elementCodename ? elementMovePathRenderers : moveEntityPathRenderers;

  return (
    <div className="moves-group">
      <div className="moves-group-label">Move</div>
      <table className="move-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Position</th>
            <th>Relative to</th>
          </tr>
        </thead>
        <tbody>
          {moves.map((op, i) => {
            const { position, codename } = getMovePosition(op);
            const path = elementCodename
              ? stripElementPrefix(op.path, elementCodename)
              : op.path;
            return (
              <tr key={`move-${op.path}-${i}`}>
                <td className="move-item">
                  {renderEntityPath(renderers, path)}
                </td>
                <td>
                  <span className={`move-badge move-badge--${position}`}>{position}</span>
                </td>
                <td className="move-reference">{codename}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
