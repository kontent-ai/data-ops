import type { ReactNode } from "react";

import type { DiffObject } from "../../../types/diffModel.js";
import { countDiffObject } from "../../utils/diffCounts.js";
import { EntitySection } from "../Section.js";
import { DeletedEntity } from "./DeletedEntity.js";
import { UpdatedEntity } from "./UpdatedEntity.js";

type DiffObjectSectionProps<T extends { codename: string }> = Readonly<{
  id: string;
  title: string;
  noChangesMessage: string;
  diffObject: DiffObject<T>;
  renderAddedEntity: (entity: T) => ReactNode;
  addedFooter?: ReactNode;
}>;

export const DiffObjectSection = <T extends { codename: string }>({
  id,
  title,
  noChangesMessage,
  diffObject,
  renderAddedEntity,
  addedFooter,
}: DiffObjectSectionProps<T>) => {
  const counts = countDiffObject(diffObject);

  if (counts.added === 0 && counts.modified === 0 && counts.removed === 0) {
    return (
      <EntitySection id={id} title={title} addedCount={0} modifiedCount={0} removedCount={0}>
        <p>{noChangesMessage}</p>
      </EntitySection>
    );
  }

  return (
    <EntitySection
      id={id}
      title={title}
      addedCount={counts.added}
      modifiedCount={counts.modified}
      removedCount={counts.removed}
    >
      {diffObject.added.length > 0 && (
        <div className="added">
          <h3>added</h3>
          {diffObject.added.map(renderAddedEntity)}
          {addedFooter}
        </div>
      )}
      {counts.modified > 0 && (
        <div className="updated">
          <h3>updated</h3>
          {[...diffObject.updated]
            .filter(([, ops]) => ops.length > 0)
            .map(([codename, ops]) => (
              <UpdatedEntity key={codename} codename={codename} operations={ops} />
            ))}
        </div>
      )}
      {diffObject.deleted.size > 0 && (
        <div className="deleted">
          <h3>deleted</h3>
          {[...diffObject.deleted].map((codename) => (
            <DeletedEntity key={codename} codename={codename} />
          ))}
        </div>
      )}
    </EntitySection>
  );
};
