import type { ContentTypeSnippetModels } from "@kontent-ai/management-sdk";

import type { RequiredCodename } from "../../../../../utils/types.js";
import type { DiffObject } from "../../../types/diffModel.js";
import { AddedElement } from "../shared/added/AddedElement.js";
import { AddedEntity } from "../shared/added/AddedEntity.js";
import { DiffObjectSection } from "../shared/DiffObjectSection.js";

type SnippetsSectionProps = Readonly<{
  snippets: DiffObject<RequiredCodename<ContentTypeSnippetModels.IAddContentTypeSnippetData>>;
}>;

export const SnippetsSection = ({ snippets }: SnippetsSectionProps) => (
  <DiffObjectSection
    id="snippets"
    title="Snippets"
    noChangesMessage="No changes to snippets."
    diffObject={snippets}
    renderAddedEntity={(snippet) => (
      <AddedEntity key={snippet.codename} codename={snippet.codename}>
        {snippet.elements.map((element) => (
          <AddedElement key={element.codename} element={element} />
        ))}
      </AddedEntity>
    )}
  />
);
