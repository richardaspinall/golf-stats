import { useState } from 'react';

type HolePickerProps = {
  holes: number[];
  selectedHole: number;
  roundName?: string;
  onSelect: (hole: number) => void;
};

export function HolePicker({ holes, selectedHole, roundName, onSelect }: HolePickerProps) {
  const [showAllHoles, setShowAllHoles] = useState(false);
  const selectedIndex = holes.indexOf(selectedHole);
  const previousHole = selectedIndex > 0 ? holes[selectedIndex - 1] : null;
  const nextHole = selectedIndex >= 0 && selectedIndex < holes.length - 1 ? holes[selectedIndex + 1] : null;
  const visibleStartIndex = Math.max(0, Math.min(selectedIndex - 1, holes.length - 3));
  const visibleHoles = holes.slice(visibleStartIndex, visibleStartIndex + 3);

  return (
    <section className="card hole-picker" aria-label="hole picker">
      <div className="hole-picker-header">
        <div>
          <p className="hint hole-picker-round">Round: {roundName || '...'}</p>
          <h2>Select hole</h2>
        </div>
        <button
          type="button"
          className="setup-toggle hole-grid-toggle"
          onClick={() => setShowAllHoles((prev) => !prev)}
          aria-expanded={showAllHoles}
          aria-controls="all-hole-grid"
        >
          {showAllHoles ? 'Hide all' : 'All 18'}
        </button>
      </div>
      <div className="hole-grid">
        <button
          type="button"
          className="hole-nav-btn"
          onClick={() => previousHole && onSelect(previousHole)}
          disabled={!previousHole}
          aria-label="Previous hole"
        >
          ‹
        </button>
        {visibleHoles.map((hole) => (
          <button
            key={hole}
            type="button"
            className={hole === selectedHole ? 'hole-btn active' : 'hole-btn hole-btn-adjacent'}
            onClick={() => onSelect(hole)}
            aria-current={hole === selectedHole ? 'page' : undefined}
          >
            <span className="hole-btn-label">Hole</span>
            <span className="hole-btn-value">{hole}</span>
          </button>
        ))}
        <button
          type="button"
          className="hole-nav-btn"
          onClick={() => nextHole && onSelect(nextHole)}
          disabled={!nextHole}
          aria-label="Next hole"
        >
          ›
        </button>
      </div>
      {showAllHoles ? (
        <div id="all-hole-grid" className="hole-grid-sheet" role="group" aria-label="All holes">
          {holes.map((hole) => (
            <button
              key={hole}
              type="button"
              className={hole === selectedHole ? 'hole-grid-sheet-btn active' : 'hole-grid-sheet-btn'}
              onClick={() => {
                onSelect(hole);
                setShowAllHoles(false);
              }}
            >
              {hole}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
