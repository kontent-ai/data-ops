import type { ReactNode } from "react";

import type { DiffObject } from "../../../types/diffModel.js";
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
  const modifiedCount = [...diffObject.updated.values()].filter((ops) => ops.length > 0).length;

  if (diffObject.added.length === 0 && modifiedCount === 0 && diffObject.deleted.size === 0) {
    return <h3>{noChangesMessage}</h3>;
  }

  return (
    <EntitySection
      id={id}
      title={title}
      addedCount={diffObject.added.length}
      modifiedCount={modifiedCount}
      removedCount={diffObject.deleted.size}
    >
      {modifiedCount > 0 && (
        <div className="updated">
          <h3>updated</h3>
          {[...diffObject.updated]
            .filter(([, ops]) => ops.length > 0)
            .map(([codename, ops]) => (
              <UpdatedEntity key={codename} codename={codename} operations={ops} />
            ))}
        </div>
      )}
      <div className="added-and-deleted">
        {diffObject.deleted.size > 0 && (
          <div className="deleted">
            <h3>deleted</h3>
            {[...diffObject.deleted].map((codename) => (
              <DeletedEntity key={codename} codename={codename} />
            ))}
          </div>
        )}
        {diffObject.added.length > 0 && (
          <div className="added">
            <h3>added</h3>
            {diffObject.added.map(renderAddedEntity)}
            {addedFooter}
          </div>
        )}
      </div>
    </EntitySection>
  );
};
