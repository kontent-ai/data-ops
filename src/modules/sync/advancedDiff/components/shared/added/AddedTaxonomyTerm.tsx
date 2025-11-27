import type { TaxonomyModels } from "@kontent-ai/management-sdk";

type AddedTaxonomyTermProps = Readonly<{
  term: TaxonomyModels.IAddTaxonomyRequestModel;
  depth?: number;
}>;

export const AddedTaxonomyTerm = ({ term, depth = 0 }: AddedTaxonomyTermProps) => (
  <ul className="term">
    <li>
      {term.name}
      {depth < 2 &&
        (term.terms?.length ?? 0) > 0 &&
        (term.terms ?? []).map((childTerm) => (
          <AddedTaxonomyTerm key={childTerm.codename} term={childTerm} depth={depth + 1} />
        ))}
    </li>
  </ul>
);
