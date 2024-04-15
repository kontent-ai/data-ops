type TermBase = { codename: string; terms: ReadonlyArray<TermBase> };

const traverseTerms = (terms: ReadonlyArray<TermBase>): TermBase[] =>
  terms.flatMap(t => [t, ...traverseTerms(t.terms)]);

export const extractTerms = (taxonomyGroups: ReadonlyArray<TermBase>): TermBase[] =>
  taxonomyGroups.flatMap(group => traverseTerms(group.terms));
