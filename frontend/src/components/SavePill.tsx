type SavePillProps = {
  state: string;
};

export function SavePill({ state }: SavePillProps) {
  return <span className={`save-pill ${state}`}>Save: {state}</span>;
}

