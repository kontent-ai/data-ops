import { zip } from "../../../utils/array.js";
import { throwError } from "../../../utils/error.js";
import { omit } from "../../../utils/object.js";
import { Replace } from "../../../utils/types.js";
import { getTargetCodename, PatchOperation } from "../types/patchOperation.js";
import { TaxonomySyncModel } from "../types/syncModel.js";
import {
  baseHandler,
  constantHandler,
  Handler,
  makeAdjustEntityHandler,
  makeAdjustOperationHandler,
  makeArrayHandler,
  makeLeafObjectHandler,
  makeObjectHandler,
  makeOrderingHandler,
  makeProvideHandler,
} from "./combinators.js";

export const taxonomyGroupHandler: Handler<TaxonomySyncModel> = makeObjectHandler({
  name: baseHandler,
  terms: {
    contextfulHandler: ({ target }) =>
      makeAdjustEntityHandler(
        terms => terms.flatMap(t => flattenTaxonomy(t)),
        makeProvideHandler((sourceTerms, targetTerms) =>
          makeAdjustOperationHandler(
            addPositionBackIntoPath(sourceTerms, targetTerms),
            makeFlattenedTaxonomyHandler(target.terms.map(t => t.codename)),
          )
        ),
      ),
  },
});

export const wholeTaxonomyGroupsHandler: Handler<ReadonlyArray<TaxonomySyncModel>> = makeArrayHandler(
  g => g.codename,
  makeLeafObjectHandler({ name: () => false }), // always replace taxonomy groups with the same codename as this handler only handles whole taxonomy groups not their parts
);

type FlattenedSyncTaxonomy = Replace<TaxonomySyncModel, { terms: [] }> & Readonly<{ position: ReadonlyArray<string> }>;

export const makeFlattenedTaxonomyHandler = (
  topLevelTargetTermCodenames: ReadonlyArray<string>,
): Handler<ReadonlyArray<FlattenedSyncTaxonomy>> =>
  makeOrderingHandler(
    makeArrayHandler(
      t => t.codename,
      makeAdjustOperationHandler(
        ops => ops.map(stripPositionFromPath),
        makeObjectHandler({
          name: baseHandler,
          terms: constantHandler,
          position: (sourcePos, targetPos) => {
            if (sourcePos.length === targetPos.length && zip(sourcePos, targetPos).every(([a, b]) => a === b)) {
              return [];
            }

            const topLevelTermCodename = topLevelTargetTermCodenames[0];
            const sourceParent = sourcePos[sourcePos.length - 1];

            const noTopLevelWhenMovigToTopErrMsg =
              "Cannot move term to the top level when there is not top-level term in the target.";

            return !sourceParent // i.e. sourcePos.length === 0
              ? [{
                op: "move" as const,
                path: "",
                before: { codename: topLevelTermCodename ?? throwError(noTopLevelWhenMovigToTopErrMsg) },
              }]
              : [{
                op: "move" as const,
                path: "",
                under: { codename: sourceParent },
              }];
          },
        }),
      ),
    ),
    t => t.codename,
    { groupBy: t => t.position.join("/") },
  );

const stripPositionFromPath = (op: PatchOperation): PatchOperation => ({
  ...op,
  path: op.path.startsWith("/position") ? op.path.slice("/position".length) : op.path,
});

const addPositionBackIntoPath =
  (sourceTerms: ReadonlyArray<FlattenedSyncTaxonomy>, targetTerms: ReadonlyArray<FlattenedSyncTaxonomy>) =>
  (ops: ReadonlyArray<PatchOperation>): ReadonlyArray<PatchOperation> => {
    const targetsByCodename = new Map([
      ...sourceTerms.map(t => [t.codename, t] as const),
      ...targetTerms.map(t => [t.codename, t] as const),
    ]);

    return ops.map(op => {
      const targetCodename =
        op.op === "addInto" && typeof op.value === "object" && op.value !== null && "codename" in op.value
          && typeof op.value.codename === "string"
          ? op.value.codename
          : getTargetCodename(op) ?? "";

      const foundTarget = targetsByCodename.get(targetCodename);

      return removePositionProp(
        foundTarget
          ? { ...op, path: termPositionToPath(foundTarget.position) + op.path }
          : op,
      );
    });
  };

const removePositionProp = (op: PatchOperation): PatchOperation => ({
  ...op,
  ..."value" in op && op.value !== null && typeof op.value === "object" && "position" in op.value
    ? { value: omit(op.value, ["position"]) }
    : {},
  ..."oldValue" in op && op.oldValue !== null && typeof op.oldValue === "object" && "position" in op.oldValue
    ? { oldValue: omit(op.oldValue, ["position"]) }
    : {},
});

const termPositionToPath = (position: ReadonlyArray<string>): string =>
  position.map(p => `/codename:${p}/terms`).join("");

const flattenTaxonomy = (
  taxonomy: TaxonomySyncModel,
  position: ReadonlyArray<string> = [],
): ReadonlyArray<FlattenedSyncTaxonomy> => [
  { ...taxonomy, position, terms: [] },
  ...taxonomy.terms.flatMap(t => flattenTaxonomy(t, [...position, taxonomy.codename])),
];
