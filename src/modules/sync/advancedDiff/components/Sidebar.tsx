import type { SidebarItem } from "../utils/sidebarSections.js";

type SidebarProps = Readonly<{
  sidebarItems: ReadonlyArray<SidebarItem>;
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

const SidebarLink = ({ item, isFirst }: Readonly<{ item: SidebarItem; isFirst: boolean }>) => (
  <a href={`#${item.sectionId}`} className={isFirst ? "active" : undefined}>
    <span>{item.title}</span>
    {item.kind === "numeric" ? (
      <NumericCounts added={item.added} modified={item.modified} removed={item.removed} />
    ) : (
      <LabelCount changeLabel={item.changeLabel} />
    )}
  </a>
);

export const Sidebar = ({ sidebarItems }: SidebarProps) => (
  <nav className="sidebar">
    {sidebarItems.map((item, i) => (
      <SidebarLink key={item.sectionId} item={item} isFirst={i === 0} />
    ))}
  </nav>
);
