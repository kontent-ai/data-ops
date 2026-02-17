import type { SidebarItem } from "../utils/sidebarSections.js";

type SidebarProps = Readonly<{
  sectionCounts: ReadonlyArray<SidebarItem>;
}>;

const NumericCounts = ({
  added,
  modified,
  removed,
}: Readonly<{ added: number; modified: number; removed: number }>) => {
  const hasChanges = added > 0 || modified > 0 || removed > 0;
  if (!hasChanges) {
    return null;
  }
  return (
    <span className="nav-counts">
      {modified > 0 && <span className="c-mod">~{modified}</span>}
      {added > 0 && <span className="c-add">+{added}</span>}
      {removed > 0 && <span className="c-rem">-{removed}</span>}
    </span>
  );
};

const LabelCount = ({ changeLabel }: Readonly<{ changeLabel: string | null }>) =>
  changeLabel ? (
    <span className="nav-counts">
      <span className="c-mod">{changeLabel}</span>
    </span>
  ) : null;

const SidebarLink = ({
  count,
  isFirst,
}: Readonly<{ count: SidebarItem; isFirst: boolean }>) => (
  <a href={`#${count.sectionId}`} className={isFirst ? "active" : undefined}>
    <span>{count.title}</span>
    {count.kind === "numeric" ? (
      <NumericCounts added={count.added} modified={count.modified} removed={count.removed} />
    ) : (
      <LabelCount changeLabel={count.changeLabel} />
    )}
  </a>
);

export const Sidebar = ({ sectionCounts }: SidebarProps) => (
  <nav className="sidebar">
    {sectionCounts.map((count, i) => (
      <SidebarLink key={count.sectionId} count={count} isFirst={i === 0} />
    ))}
  </nav>
);
