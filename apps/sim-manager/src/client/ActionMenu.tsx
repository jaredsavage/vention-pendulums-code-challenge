import { useId } from 'react';

export interface Action {
  label: string;
  title?: string;
  disabled?: boolean;
  onSelect: () => void;
}

interface Props {
  label: string;
  actions: Action[];
}

// A ⋯ that opens a short list of actions. The browser keeps it open and closes
// it again, and choosing an action closes it too.
export function ActionMenu({ label, actions }: Props) {
  const menuId = useId();

  const items = actions.map((action) => (
    <li key={action.label}>
      <button
        type="button"
        title={action.title}
        disabled={action.disabled}
        popoverTarget={menuId}
        popoverTargetAction="hide"
        onClick={action.onSelect}
      >
        {action.label}
      </button>
    </li>
  ));

  return (
    <>
      <button type="button" popoverTarget={menuId} aria-label={label}>
        ⋯
      </button>
      <menu id={menuId} popover="auto">
        {items}
      </menu>
    </>
  );
}
