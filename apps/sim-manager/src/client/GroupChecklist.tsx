import { api } from './api.ts';

interface Props {
  groups: string[];
  selected: string[];
}

export function GroupChecklist({ groups, selected }: Props) {
  function toggle(group: string, checked: boolean) {
    const others = selected.filter((name) => name !== group);
    const names = checked ? [...others, group] : others;

    api.selectGroups(names);
  }

  const checkboxes = groups.map((group) => {
    const label = group.replaceAll('-', ' ');

    return (
      <label key={group}>
        <input
          type="checkbox"
          checked={selected.includes(group)}
          onChange={({ target }) => toggle(group, target.checked)}
        />
        {label}
      </label>
    );
  });

  return (
    <section>
      <h2>Groups</h2>
      {checkboxes}
    </section>
  );
}
