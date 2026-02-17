import type { ReactNode } from "react";

type SimpleSectionProps = Readonly<{
  id: string;
  header: ReactNode;
  children: ReactNode;
}>;

export const SimpleSection = ({ id, header, children }: SimpleSectionProps) => (
  <details className="entity-section" id={id} open>
    <summary className="entity-section-header">{header}</summary>
    <div className="entity-section-content">{children}</div>
  </details>
);
