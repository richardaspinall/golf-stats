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
  const handleHoleComplete = useCallback(() => {
    const selectedHoleIndex = HOLES.indexOf(selectedHole);
    const nextHole = HOLES[selectedHoleIndex + 1] ?? HOLES[0];
    setSelectedHole(nextHole);
  }, [selectedHole, setSelectedHole]);

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
          <div className="virtual-caddy-page-header-copy">
            <h2>{isFocusMode ? 'Virtual Caddy' : 'Plan the next shot'}</h2>
          </div>
          <button type="button" className={isFocusMode ? 'save-btn virtual-caddy-focus-btn' : 'setup-toggle virtual-caddy-focus-btn'} onClick={onToggleFocusMode}>
            {isFocusMode ? 'Exit focus' : 'Focus'}
          </button>
        </div>

        <div className={isFocusMode ? 'virtual-caddy-overview-grid virtual-caddy-overview-grid-focus' : 'virtual-caddy-overview-grid'}>
          <div className="prototype-block">
            <span className="quick-select-label">Hole status</span>
            <div className="virtual-caddy-overview-values">
              {displayHoleIndex != null ? <span>Index: {displayHoleIndex}</span> : null}
              {teeToGreenMeters != null ? <span>Distance: {teeToGreenMeters}m</span> : null}
              {displayHolePar != null ? <span>Par: {displayHolePar}</span> : null}
              <span>Score: {holeStats.score}</span>
            </div>
          </div>
        </div>

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
          onHoleComplete={handleHoleComplete}
        />
      </section>
    </>
  );
}
