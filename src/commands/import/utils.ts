export type CompareExternalIdsResult = "BothUndefined" | "OnlyFileUndefined" | "OnlyProjectUndefined" | "Same" | "Different";

export const compareExternalIds = (projectEntityExternalId: string | undefined, fileEntityExternalId: string | undefined): CompareExternalIdsResult => {
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
