import type { ReactNode } from "react";

type AddedEntityProps = Readonly<{
  codename: string;
  children: ReactNode;
}>;

export const AddedEntity = ({ codename, children }: AddedEntityProps) => (
  <details className="entity-detail">
    <summary className="entity-name">{codename}</summary>
    <div>{children}</div>
  </details>
);
