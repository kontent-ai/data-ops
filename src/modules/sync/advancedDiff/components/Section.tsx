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
  <details className="entity-section" id={id} open>
    <summary className="entity-section-header">
      <div>{title}</div>
      <div className="num-modified push">✎ {modifiedCount}</div>
      <div className="num-added">+ {addedCount}</div>
      <div className="num-removed">− {removedCount}</div>
    </summary>
    <div className="entity-section-content">{children}</div>
  </details>
);
