import { useCallback } from 'react';

import { HolePicker } from '../HolePicker';
import { VirtualCaddyPanel } from '../VirtualCaddyPanel';
import { HOLES } from '../../lib/constants';
import type { Course, HoleStats, RoundListItem, StatsByHole, WedgeEntry, WedgeMatrix } from '../../types';

type VirtualCaddyPageProps = {
  round: {
    selectedHole: number;
    displayHoleIndex: number;
    displayHolePar: number | null;
    activeRound?: RoundListItem;
    activeCourse?: Course;
    holeStats: HoleStats;
    statsByHole: StatsByHole;
    saveState: string;
    teeToGreenMeters: number | null;
    clubCarryByClub: Record<string, number>;
    wedgeMatrices: WedgeMatrix[];
    wedgeEntriesByMatrix: Record<number, WedgeEntry[]>;
  };
  actions: {
    setSelectedHole: (hole: number) => void;
    saveCurrentRound: () => Promise<boolean>;
    replaceHoleStats: (hole: number, nextHoleStats: HoleStats) => void;
    saveHoleStats: (hole: number, nextHoleStats: HoleStats, options?: { persistToServer?: boolean }) => Promise<boolean>;
    saveClubActual: (shot: { club: string; actualMeters: number }) => Promise<number | null>;
    syncVirtualCaddyClubActuals?: (payload: {
      roundId: string;
      hole: number;
      shots: Array<{ shotId: number; club: string; actualMeters: number }>;
    }) => Promise<Array<{ shotId: number; entryId: number }>>;
    deleteClubActualEntry: (entryId: number) => Promise<void>;
    onToggleFocusMode: () => void;
    onOpenWedgeMatrix?: (matrixId: number | null) => void;
  };
  isFocusMode: boolean;
};

export function VirtualCaddyPage({ round, actions }: VirtualCaddyPageProps) {
  const {
    selectedHole,
    displayHoleIndex,
    displayHolePar,
    activeRound,
    activeCourse,
    holeStats,
    statsByHole,
    saveState,
    teeToGreenMeters,
    clubCarryByClub,
    wedgeMatrices,
    wedgeEntriesByMatrix,
  } = round;
  const {
    setSelectedHole,
    saveCurrentRound,
    replaceHoleStats,
    saveHoleStats,
    saveClubActual,
    syncVirtualCaddyClubActuals,
    deleteClubActualEntry,
    onToggleFocusMode,
    onOpenWedgeMatrix,
  } = actions;
  const { isFocusMode } = round;
  const handleReplaceHoleStats = useCallback((nextHoleStats: HoleStats) => replaceHoleStats(selectedHole, nextHoleStats), [replaceHoleStats, selectedHole]);
  const handleSaveHoleStats = useCallback(
    (nextHoleStats: HoleStats, options?: { persistToServer?: boolean }) => saveHoleStats(selectedHole, nextHoleStats, options),
    [saveHoleStats, selectedHole],
  );
  const handleHoleComplete = useCallback(async (nextHoleStats: HoleStats, options?: { persistToServer?: boolean; advanceHole?: boolean }) => {
    if (options?.persistToServer !== false) {
      const didSave = await saveHoleStats(selectedHole, nextHoleStats, { persistToServer: true });
      if (!didSave) {
        return false;
      }
    }

    if (options?.advanceHole === false) {
      return true;
    }

    const selectedHoleIndex = HOLES.indexOf(selectedHole);
    const nextHole = HOLES[selectedHoleIndex + 1] ?? HOLES[0];
    setSelectedHole(nextHole);
    return true;
  }, [saveHoleStats, selectedHole, setSelectedHole]);

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
        holeScores={Object.fromEntries(HOLES.map((hole) => [hole, Number(statsByHole[hole]?.score || 0)]))}
        selectedHoleMeta={{
          holeIndex: displayHoleIndex,
          par: displayHolePar,
          distanceMeters: teeToGreenMeters,
        }}
        onSelect={handleSelectHole}
      />

      <section className={isFocusMode ? 'card virtual-caddy-page virtual-caddy-page-focus' : 'card virtual-caddy-page'} aria-label="virtual caddy">
        <div className="virtual-caddy-page-header">
          <button type="button" className={isFocusMode ? 'save-btn virtual-caddy-focus-btn' : 'setup-toggle virtual-caddy-focus-btn'} onClick={onToggleFocusMode}>
            {isFocusMode ? 'Exit focus' : 'Focus'}
          </button>
        </div>

        <VirtualCaddyPanel
          roundId={activeRound?.id ?? null}
          hole={selectedHole}
          holeStats={holeStats}
          displayHoleIndex={displayHoleIndex}
          displayHolePar={displayHolePar}
          defaultDistanceMeters={teeToGreenMeters}
          carryByClub={clubCarryByClub}
          wedgeMatrices={wedgeMatrices}
          wedgeEntriesByMatrix={wedgeEntriesByMatrix}
          isFocusMode={isFocusMode}
          onReplaceHoleStats={handleReplaceHoleStats}
          onSaveHoleStats={handleSaveHoleStats}
          onSaveClubActual={saveClubActual}
          onSyncClubActuals={syncVirtualCaddyClubActuals}
          onDeleteClubActualEntry={deleteClubActualEntry}
          onHoleComplete={handleHoleComplete}
          onOpenWedgeMatrix={onOpenWedgeMatrix}
        />
      </section>
    </>
  );
}
