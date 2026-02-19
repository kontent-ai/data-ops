import type { ReactNode } from "react";

type EntitySectionProps = Readonly<{
  id: string;
  title: string;
  addedCount: number;
  modifiedCount: number;
  removedCount: number;
  children: ReactNode;
}>;

export const EntitySection = ({
  id,
  title,
  addedCount,
  modifiedCount,
  removedCount,
  children,
}: EntitySectionProps) => (
  <div className="entity-section" id={id}>
    <div className="entity-section-header">
      <div>{title}</div>
      <div className="num-modified push">✎ {modifiedCount}</div>
      <div className="num-added">+ {addedCount}</div>
      <div className="num-removed">− {removedCount}</div>
    </div>
    <div className="entity-section-content">{children}</div>
  </div>
);
