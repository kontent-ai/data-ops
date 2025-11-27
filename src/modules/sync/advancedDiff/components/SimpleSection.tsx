import type { ReactNode } from "react";

type SimpleSectionProps = Readonly<{
  id: string;
  header: ReactNode;
  children: ReactNode;
}>;

export const SimpleSection = ({ id, header, children }: SimpleSectionProps) => (
  <details className="entity-section">
    <summary className="entity-section-header">{header}</summary>
    <div id={id} className="entity-section-content">
      {children}
    </div>
  </details>
);
