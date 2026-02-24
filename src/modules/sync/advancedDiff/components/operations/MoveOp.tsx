import type { ReactNode } from "react";

import type { MovePatchOperation } from "../../../types/patchOperation.js";
import {
  modifierIcons,
  moveEntityPathRenderers,
  renderEntityPath,
} from "../../utils/pathRenderers.js";

type MoveOpProps = Readonly<{
  op: MovePatchOperation;
}>;

const renderPosition = (op: MovePatchOperation): ReactNode =>
  "after" in op ? (
    <>
      after <strong>{op.after.codename}</strong>
    </>
  ) : "before" in op ? (
    <>
      before <strong>{op.before.codename}</strong>
    </>
  ) : (
    <>
      under <strong>{op.under.codename}</strong>
    </>
  );

export const MoveOp = ({ op }: MoveOpProps) => {
  const pathElement = renderEntityPath(moveEntityPathRenderers, op.path);
  const positionElement = renderPosition(op);

  return (
    <div className="op">
      {modifierIcons.move}
      {pathElement} moved
      {positionElement}
    </div>
  );
};
