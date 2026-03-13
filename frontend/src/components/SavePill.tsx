type SavePillProps = {
  state: string;
};

export function SavePill({ state }: SavePillProps) {
  return (
    <span className={`save-pill ${state}`}>
      <span className="save-pill-dot" aria-hidden="true" />
      <span className="save-pill-label">Sync</span>
      <strong>{state}</strong>
    </span>
  );
}
