import React from "react";
import type { Group } from "../../types/split-group";

interface Props {
  groups: Group[];
  onSelect: (group: Group) => void;
}

export const GroupList: React.FC<Props> = ({ groups, onSelect }) => {
  if (!groups.length) return <div>No groups yet. Create one!</div>;
  return (
    <ul>
      {groups.map((g) => (
        <li key={g.id} onClick={() => onSelect(g)}>
          {g.name} ({g.members.length} members)
        </li>
      ))}
    </ul>
  );
};
