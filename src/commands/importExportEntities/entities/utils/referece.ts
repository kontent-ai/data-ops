import { ImportContext, SimplifiedImportContext } from "../../entityDefinition.js";

type Params = Readonly<{
  newId: string | undefined;
  oldId: string;
  entityName: string;
}>;

export const createReference = (params: Params) =>
  params.newId ? { id: params.newId } : { external_id: `non-existent-${params.entityName}-${params.oldId}` };

export const simplifyContext = (context: ImportContext) => {
  const getSimplifiedMap = (map: ReadonlyMap<string, any>) => new Map([...map].map(([k, v]) => [k, v.selfId ?? v]));

  const simpleContext = Object.fromEntries(
    Object.entries(context).map(([k, v]) => [k, getSimplifiedMap(v)]),
  );

  return simpleContext as unknown as SimplifiedImportContext;
};
