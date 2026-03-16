import type { ReactNode } from "react";

type SimpleSectionProps = Readonly<{
  id: string;
  header: ReactNode;
  children: ReactNode;
}>;

export const SimpleSection = ({ id, header, children }: SimpleSectionProps) => (
  <div className="entity-section" id={id}>
    <div className="entity-section-header">{header}</div>
    <div className="entity-section-content">{children}</div>
  </div>
);
