type DeletedEntityProps = Readonly<{
  codename: string;
}>;

export const DeletedEntity = ({ codename }: DeletedEntityProps) => (
  <div className="entity-detail">
    <div className="entity-name removed">{codename}</div>
  </div>
);
