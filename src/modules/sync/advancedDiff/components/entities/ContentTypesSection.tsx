import type { ContentTypeModels } from "@kontent-ai/management-sdk";

import type { RequiredCodename } from "../../../../../utils/types.js";
import type { DiffObject } from "../../../types/diffModel.js";
import { AddedElement } from "../shared/added/AddedElement.js";
import { AddedEntity } from "../shared/added/AddedEntity.js";
import { DiffObjectSection } from "../shared/DiffObjectSection.js";

type ContentTypesSectionProps = Readonly<{
  contentTypes: DiffObject<RequiredCodename<ContentTypeModels.IAddContentTypeData>>;
}>;

export const ContentTypesSection = ({ contentTypes }: ContentTypesSectionProps) => (
  <DiffObjectSection
    id="types"
    title="Content types"
    noChangesMessage="No changes to content types."
    diffObject={contentTypes}
    renderAddedEntity={(type) => (
      <AddedEntity key={type.codename} codename={type.codename}>
        {type.elements.map((element) => (
          <AddedElement key={element.codename} element={element} />
        ))}
      </AddedEntity>
    )}
  />
);
