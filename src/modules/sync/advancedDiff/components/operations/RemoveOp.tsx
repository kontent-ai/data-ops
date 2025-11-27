import type { RemovePatchOperation } from "../../../types/patchOperation.js";
import {
  getEntityPathRenderer,
  modifierIcons,
  removeEntityPathRenderers,
} from "../../utils/pathRenderers.js";

type RemoveOpProps = Readonly<{
  op: RemovePatchOperation;
}>;

export const RemoveOp = ({ op }: RemoveOpProps) => {
  const pathElement = getEntityPathRenderer(removeEntityPathRenderers, op.path);

  return (
    <div className="op">
      {modifierIcons.remove}
      {pathElement} removed
    </div>
  );
};
