import type { ReactNode } from "react";

import type { AddIntoPatchOperation } from "../../../types/patchOperation.js";
import {
  addEntityPathRenderers,
  modifierIcons,
  renderEntityPath,
} from "../../utils/pathRenderers.js";
import { renderValueOrIdentifier } from "../../utils/valueHelpers.js";

type AddIntoOpProps = Readonly<{
  op: AddIntoPatchOperation;
}>;

const renderPosition = (op: AddIntoPatchOperation): ReactNode =>
  op.after ? (
    <>
      after <strong>{op.after.codename}</strong>
    </>
  ) : op.before ? (
    <>
      before <strong>{op.before.codename}</strong>
    </>
  ) : null;

export const AddIntoOp = ({ op }: AddIntoOpProps) => {
  const pathElement = renderEntityPath(addEntityPathRenderers, op.path);
  const valueElement = renderValueOrIdentifier(op.value);
  const positionElement = renderPosition(op);

  return (
    <div className="op">
      {modifierIcons.addInto}
      {pathElement} {valueElement} added
      {positionElement}
    </div>
  );
};
