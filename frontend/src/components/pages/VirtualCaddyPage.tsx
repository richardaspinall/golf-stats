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
    setShowDistanceTracker: (value: boolean) => void;
    setDistanceMode: (value: string) => void;
    setTargetDistanceMeters: (value: number) => void;
    setClubSelection: (value: string | ((prev: string) => string)) => void;
    setLieSelection: (value: string | ((prev: string) => string)) => void;
    saveCurrentRound: () => Promise<boolean>;
    executeVirtualCaddyShot: (payload: {
      hole: number;
      scoreDelta: number;
      oopResult: 'none' | 'look' | 'noLook';
      shotCategory: 'none' | 'wedge' | 'chip' | 'bunker';
      inside100Over3: boolean;
    }) => void;
    goToTrackPage: () => void;
  };
};

export function VirtualCaddyPage({ round, actions }: VirtualCaddyPageProps) {
  const { selectedHole, displayHoleIndex, displayHolePar, activeRound, activeCourse, holeStats, saveState, teeToGreenMeters, clubCarryByClub } = round;
  const {
    setSelectedHole,
    setShowDistanceTracker,
    setDistanceMode,
    setTargetDistanceMeters,
    setClubSelection,
    setLieSelection,
    saveCurrentRound,
    executeVirtualCaddyShot,
    goToTrackPage,
  } =
    actions;

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
      <HolePicker holes={HOLES} selectedHole={selectedHole} roundName={activeRound?.name} onSelect={handleSelectHole} />

      <section className="card" aria-label="virtual caddy">
        <div className="virtual-caddy-page-header">
          <div>
            <p className="virtual-caddy-kicker">Virtual Caddy</p>
            <h2>Plan the next shot</h2>
          </div>
          <button type="button" className="setup-toggle" onClick={goToTrackPage}>
            Go to track
          </button>
        </div>

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

        <div className="virtual-caddy-overview-grid">
          <div className="prototype-block">
            <span className="quick-select-label">Hole status</span>
            <div className="virtual-caddy-overview-values">
              <span>Score: {holeStats.score}</span>
              <span>Fairway: {holeStats.fairwaySelection ? String(holeStats.fairwaySelection) : 'Not set'}</span>
              <span>GIR: {holeStats.girSelection ? String(holeStats.girSelection) : 'Not set'}</span>
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

        <VirtualCaddyPanel
          hole={selectedHole}
          defaultDistanceMeters={teeToGreenMeters}
          carryByClub={clubCarryByClub}
          onUseRecommendation={({ club, targetDistanceMeters: nextTargetDistanceMeters, lie }) => {
            setClubSelection(club);
            setTargetDistanceMeters(nextTargetDistanceMeters);
            setLieSelection(lie);
            setShowDistanceTracker(true);
            setDistanceMode('setup');
            goToTrackPage();
          }}
          onExecuteShot={(execution) => executeVirtualCaddyShot(execution)}
        />
      </section>
    </>
  );
}
