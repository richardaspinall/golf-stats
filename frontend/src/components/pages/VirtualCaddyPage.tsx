import { useCallback } from 'react';

import { HolePicker } from '../HolePicker';
import { VirtualCaddyPanel } from '../VirtualCaddyPanel';
import { HOLES } from '../../lib/constants';
import type { Course, HoleStats, RoundListItem } from '../../types';

type VirtualCaddyPageProps = {
  round: {
    selectedHole: number;
    displayHoleIndex: number;
    displayHolePar: number | null;
    activeRound?: RoundListItem;
    activeCourse?: Course;
    holeStats: HoleStats;
    saveState: string;
    teeToGreenMeters: number | null;
    clubCarryByClub: Record<string, number>;
  };
  actions: {
    setSelectedHole: (hole: number) => void;
    saveCurrentRound: () => Promise<boolean>;
    replaceHoleStats: (hole: number, nextHoleStats: HoleStats) => void;
    saveHoleStats: (hole: number, nextHoleStats: HoleStats) => Promise<boolean>;
    saveClubActual: (shot: { club: string; actualMeters: number }) => Promise<number | null>;
    deleteClubActualEntry: (entryId: number) => Promise<void>;
    onToggleFocusMode: () => void;
  };
  isFocusMode: boolean;
};

export function VirtualCaddyPage({ round, actions }: VirtualCaddyPageProps) {
  const { selectedHole, displayHoleIndex, displayHolePar, activeRound, activeCourse, holeStats, saveState, teeToGreenMeters, clubCarryByClub } = round;
  const { setSelectedHole, saveCurrentRound, replaceHoleStats, saveHoleStats, saveClubActual, deleteClubActualEntry, onToggleFocusMode } = actions;
  const { isFocusMode } = round;
  const handleReplaceHoleStats = useCallback((nextHoleStats: HoleStats) => replaceHoleStats(selectedHole, nextHoleStats), [replaceHoleStats, selectedHole]);
  const handleSaveHoleStats = useCallback((nextHoleStats: HoleStats) => saveHoleStats(selectedHole, nextHoleStats), [saveHoleStats, selectedHole]);

  const handleSelectHole = async (hole: number) => {
    if (hole === selectedHole || saveState === 'saving' || saveState === 'loading') {
      return;
    }

    if (saveState === 'unsaved') {
      const didSave = await saveCurrentRound();
      if (!didSave) {
        return;
      }
    }

    setSelectedHole(hole);
  };

  return (
    <>
      <HolePicker
        holes={HOLES}
        selectedHole={selectedHole}
        roundName={activeRound?.name}
        selectedHoleMeta={{
          holeIndex: displayHoleIndex,
          par: displayHolePar,
          distanceMeters: teeToGreenMeters,
        }}
        onSelect={handleSelectHole}
      />

      <section className={isFocusMode ? 'card virtual-caddy-page virtual-caddy-page-focus' : 'card virtual-caddy-page'} aria-label="virtual caddy">
        <div className="virtual-caddy-page-header">
          <div>
            <p className="virtual-caddy-kicker">Virtual Caddy</p>
            <h2>{isFocusMode ? 'Virtual Caddy' : 'Plan the next shot'}</h2>
            {!isFocusMode ? <p className="hint">Keep only the essentials on screen when you want less clutter during the round.</p> : null}
          </div>
          <button type="button" className={isFocusMode ? 'save-btn virtual-caddy-focus-btn' : 'setup-toggle virtual-caddy-focus-btn'} onClick={onToggleFocusMode}>
            {isFocusMode ? 'Exit focus' : 'Focus'}
          </button>
        </div>

        {!isFocusMode ? (
          <div className="virtual-caddy-hole-meta">
            <div className="virtual-caddy-hole-pill">
              <span>Hole</span>
              <strong>{selectedHole}</strong>
            </div>
            <div className="virtual-caddy-hole-copy">
              <strong>
                Index {displayHoleIndex} | Par {displayHolePar ?? '—'}
              </strong>
              <p>{activeCourse ? activeCourse.name : 'No course selected for this round yet.'}</p>
            </div>
          </div>
        ) : null}

        {!isFocusMode ? (
          <div className="virtual-caddy-overview-grid">
            <div className="prototype-block">
              <span className="quick-select-label">Hole status</span>
              <div className="virtual-caddy-overview-values">
                <span>Score: {holeStats.score}</span>
                <span>Fairway: {holeStats.fairwaySelection ? String(holeStats.fairwaySelection) : 'Not set'}</span>
                <span>Green: {holeStats.girSelection ? String(holeStats.girSelection) : 'Not set'}</span>
              </div>
            </div>
            <div className="prototype-block">
              <span className="quick-select-label">Distance to middle</span>
              <div className="virtual-caddy-overview-distance">
                <strong>{teeToGreenMeters != null ? `${teeToGreenMeters}m` : 'Not available'}</strong>
                <p>{teeToGreenMeters != null ? 'Pulled from saved hole markers.' : 'Add tee and green markers on the course map to prefill this.'}</p>
              </div>
            </div>
          </div>
        ) : null}

        <VirtualCaddyPanel
          hole={selectedHole}
          holeStats={holeStats}
          displayHolePar={displayHolePar}
          defaultDistanceMeters={teeToGreenMeters}
          carryByClub={clubCarryByClub}
          isFocusMode={isFocusMode}
          onReplaceHoleStats={handleReplaceHoleStats}
          onSaveHoleStats={handleSaveHoleStats}
          onSaveClubActual={saveClubActual}
          onDeleteClubActualEntry={deleteClubActualEntry}
        />
      </section>
    </>
  );
}
