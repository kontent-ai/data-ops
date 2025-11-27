import type { SharedContracts, SpaceModels } from "@kontent-ai/management-sdk";

import type { Replace, RequiredCodename } from "../../../../../utils/types.js";
import type { DiffObject } from "../../../types/diffModel.js";
import { AddedEntity } from "../shared/added/AddedEntity.js";
import { AddedObjectProperties } from "../shared/added/AddedObjectProperties.js";
import { DiffObjectSection } from "../shared/DiffObjectSection.js";

type SpacesSectionProps = Readonly<{
  spaces: DiffObject<
    Replace<
      RequiredCodename<SpaceModels.IAddSpaceData>,
      { collections: ReadonlyArray<SharedContracts.IReferenceObjectContract> }
    >
  >;
}>;

export const SpacesSection = ({ spaces }: SpacesSectionProps) => (
  <DiffObjectSection
    id="spaces"
    title="Spaces"
    noChangesMessage="No changes to spaces."
    diffObject={spaces}
    renderAddedEntity={(space) => (
      <AddedEntity key={space.codename} codename={space.codename}>
        <div className="entity-operations">
          <AddedObjectProperties object={space} />
        </div>
      </AddedEntity>
    )}
  />
);
