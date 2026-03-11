type HolePickerProps = {
  holes: number[];
  selectedHole: number;
  onSelect: (hole: number) => void;
};

export function HolePicker({ holes, selectedHole, onSelect }: HolePickerProps) {
  return (
    <section className="card hole-picker" aria-label="hole picker">
      <h2>Select hole</h2>
      <div className="hole-grid">
        {holes.map((hole) => (
          <button key={hole} className={hole === selectedHole ? 'hole-btn active' : 'hole-btn'} onClick={() => onSelect(hole)}>
            {hole}
          </button>
        ))}
      </div>
    </section>
  );
}
