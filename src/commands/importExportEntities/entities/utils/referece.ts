type Params = Readonly<{
  newId: string | undefined;
  oldId: string | undefined;
  entityName: string;
}>;

export const createReference = (params: Params) =>
  params.newId ? { id: params.newId } : { external_id: `non-existent-${params.entityName}-${params.oldId}` };
