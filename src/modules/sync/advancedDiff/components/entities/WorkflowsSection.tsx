import type { WorkflowModels } from "@kontent-ai/management-sdk";

import type { RequiredCodename } from "../../../../../utils/types.js";
import type { DiffObject } from "../../../types/diffModel.js";
import { AddedEntity } from "../shared/added/AddedEntity.js";
import { AddedObjectProperties } from "../shared/added/AddedObjectProperties.js";
import { DiffObjectSection } from "../shared/DiffObjectSection.js";

type WorkflowsSectionProps = Readonly<{
  workflows: DiffObject<RequiredCodename<WorkflowModels.IAddWorkflowData>>;
}>;

export const WorkflowsSection = ({ workflows }: WorkflowsSectionProps) => (
  <DiffObjectSection
    id="workflows"
    title="Workflows"
    noChangesMessage="No changes to workflows."
    diffObject={workflows}
    renderAddedEntity={(workflow) => (
      <AddedEntity key={workflow.codename} codename={workflow.codename}>
        <div className="entity-operations">
          <AddedObjectProperties object={workflow} />
        </div>
      </AddedEntity>
    )}
  />
);
