import { TaxonomyContracts } from "@kontent-ai/management-sdk";

import { TaxonomySyncModel } from "../types/fileContentModel.js";

export const transformTaxonomyGroupsModel = (taxonomies: ReadonlyArray<TaxonomyContracts.ITaxonomyContract>) => {
  // TODO
  taxonomies as never;

  return [] as TaxonomySyncModel[];
};
