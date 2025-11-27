import type { LanguageModels } from "@kontent-ai/management-sdk";

import type { RequiredCodename } from "../../../../../utils/types.js";
import type { DiffObject } from "../../../types/diffModel.js";
import { AddedEntity } from "../shared/added/AddedEntity.js";
import { AddedObjectProperties } from "../shared/added/AddedObjectProperties.js";
import { DiffObjectSection } from "../shared/DiffObjectSection.js";

type LanguagesSectionProps = Readonly<{
  languages: DiffObject<
    RequiredCodename<LanguageModels.IAddLanguageData> & Readonly<{ is_default: boolean }>
  >;
}>;

export const LanguagesSection = ({ languages }: LanguagesSectionProps) => (
  <DiffObjectSection
    id="languages"
    title="Languages"
    noChangesMessage="No changes to languages."
    diffObject={languages}
    renderAddedEntity={(language) => (
      <AddedEntity key={language.codename} codename={language.codename}>
        <div className="entity-operations">
          <AddedObjectProperties
            object={{
              ...language,
              fallback_language: language.fallback_language?.codename,
            }}
          />
        </div>
      </AddedEntity>
    )}
  />
);
