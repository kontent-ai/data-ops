import { isOp } from "../../../sync/utils.js";
import type { DiffObject } from "../../../types/diffModel.js";
import type { PatchOperation } from "../../../types/patchOperation.js";
import { getTargetCodename } from "../../../types/patchOperation.js";
import { stripEntityPrefix } from "../../utils/groupOperations.js";
import { AddedEntity } from "../shared/added/AddedEntity.js";
import { AddedObjectProperties } from "../shared/added/AddedObjectProperties.js";
import { DiffObjectSection } from "../shared/DiffObjectSection.js";

type CollectionsSectionProps = Readonly<{
  collections: ReadonlyArray<PatchOperation>;
}>;

type CollectionEntity = Readonly<{ codename: string } & Record<string, unknown>>;

const toDiffObject = (ops: ReadonlyArray<PatchOperation>): DiffObject<CollectionEntity> => ({
  added: ops.filter(isOp("addInto")).map((op) => op.value as CollectionEntity),
  deleted: new Set(
    ops.filter(isOp("remove")).flatMap((op) => {
      const codename = getTargetCodename(op);
      return codename ? [codename] : [];
    }),
  ),
  updated: new Map(
    [
      ...Map.groupBy(
        ops.filter(
          (op): op is Extract<PatchOperation, { op: "replace" | "move" }> =>
            op.op === "replace" || op.op === "move",
        ),
        getTargetCodename,
      ),
    ].flatMap(([codename, ops]) =>
      codename !== null
        ? [
            [codename, ops.map((op) => stripEntityPrefix(op, codename))] as [
              string,
              PatchOperation[],
            ],
          ]
        : [],
    ),
  ),
});

export const CollectionsSection = ({ collections }: CollectionsSectionProps) => (
  <DiffObjectSection
    id="collections-section"
    title="Collections"
    noChangesMessage="No changes to collections."
    diffObject={toDiffObject(collections)}
    renderAddedEntity={(collection) => (
      <AddedEntity key={collection.codename} codename={collection.codename}>
        <div className="entity-operations">
          <AddedObjectProperties object={collection} />
        </div>
      </AddedEntity>
    )}
  />
);
