export type CompareExternalIdsResult =
  | "BothUndefined"
  | "OnlyFileUndefined"
  | "OnlyProjectUndefined"
  | "Same"
  | "Different";

export const compareExternalIds = (
  projectEntityExternalId: string | undefined,
  fileEntityExternalId: string | undefined,
): CompareExternalIdsResult => {
  if (typeof projectEntityExternalId === "undefined" && typeof fileEntityExternalId === "undefined") {
    return "BothUndefined";
  }
  if (typeof projectEntityExternalId === "undefined") {
    return "OnlyProjectUndefined";
  }
  if (typeof fileEntityExternalId === "undefined") {
    return "OnlyFileUndefined";
  }

  return projectEntityExternalId === fileEntityExternalId ? "Same" : "Different";
};

export const getRequired = <Value>(
  map: ReadonlyMap<string, Value>,
  oldId: string,
  entityName: string,
): Value => {
  const result = map.get(oldId);

  if (!result) {
    throw new Error(`Failed to find new id for ${entityName} by old id "${oldId}". This should never happen.`);
  }

  return result;
};
