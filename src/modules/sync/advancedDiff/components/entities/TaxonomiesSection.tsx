import type { TaxonomyModels } from "@kontent-ai/management-sdk";

import type { RequiredCodename } from "../../../../../utils/types.js";
import type { DiffObject } from "../../../types/diffModel.js";
import { AddedEntity } from "../shared/added/AddedEntity.js";
import { AddedTaxonomyTerm } from "../shared/added/AddedTaxonomyTerm.js";
import { DiffObjectSection } from "../shared/DiffObjectSection.js";

type TaxonomiesSectionProps = Readonly<{
  taxonomies: DiffObject<RequiredCodename<TaxonomyModels.IAddTaxonomyRequestModel>>;
}>;

export const TaxonomiesSection = ({ taxonomies }: TaxonomiesSectionProps) => (
  <DiffObjectSection
    id="taxonomies"
    title="Taxonomy groups"
    noChangesMessage="No changes to taxonomy groups."
    diffObject={taxonomies}
    renderAddedEntity={(taxonomy) => (
      <AddedEntity key={taxonomy.codename} codename={taxonomy.codename}>
        {(taxonomy.terms ?? []).map((term) => (
          <AddedTaxonomyTerm key={term.codename} term={term} />
        ))}
      </AddedEntity>
    )}
    addedFooter={<div className="warning">⚠️ Only the first three depth levels shown.</div>}
  />
);
