import { useEffect, useMemo, useRef, useState } from 'react';

import { OverviewStep } from './components/OverviewStep';
import { PrepStep } from './components/PrepStep';
import { SetupStep } from './components/SetupStep';
import { ExecuteStep } from './components/ExecuteStep';
import { CompletionCard } from './components/CompletionCard';
import { TrailList } from './components/TrailList';
import { useVirtualCaddyController } from './hooks/useVirtualCaddyController';
import { buildNextHoleStats, buildPersistedDraftFromState } from './adapters/persistence';
import { getCompletionViewModel, getOverviewViewModel, getShotBannerViewModel } from './state/viewModel';
import type { VirtualCaddyPanelProps } from './types';
import { hasHolePlayStarted, sanitizeHolePrepPlan } from '../../lib/holePrep';
import type { HolePrepPlan } from '../../types';

export function VirtualCaddyFeature(props: VirtualCaddyPanelProps) {
  const { hole, displayHoleIndex = null, displayHolePar, defaultDistanceMeters, isFocusMode = false } = props;
  const [activeTab, setActiveTab] = useState<'play' | 'prep'>('play');
  const [prepDraft, setPrepDraft] = useState<HolePrepPlan>(() => sanitizeHolePrepPlan(props.holeStats.prepPlan));
  const [savedPrepPlan, setSavedPrepPlan] = useState<HolePrepPlan>(() => sanitizeHolePrepPlan(props.holeStats.prepPlan));
  const [prepSaveState, setPrepSaveState] = useState('saved');
  const lastLoadedHoleRef = useRef(hole);
  const {
    state,
    recommendation,
    baseRecommendation,
    shotNumber,
    isFirstShot,
    isPutting,
    isChipping,
    displayShotLabel,
    displayedCarryBook,
    visibleOverrideClubs,
    outcomeMode,
    outcomeOptions,
    canOverrideOutcomeMode,
    canSaveShot,
    isHoleComplete,
    completedHoleSummary,
    finalShot,
    isHoleInOneFinish,
    showHoledCelebration,
    showOopOptions,
    hasCustomContext,
    getTrailRecordedDistanceMeters,
    getTrailSummary,
    actions,
  } = useVirtualCaddyController(props);

  const useCompassResultLayout = !isPutting && !isChipping;
  const { overviewTitle, overviewDistanceSummary } = getOverviewViewModel(state, defaultDistanceMeters);
  const { shotDistanceBannerLabel, shotDistanceBannerValue, canResetShotDistanceBanner, distanceSliderMax } = getShotBannerViewModel(state);
  const { completionTitle, completionDetail } = getCompletionViewModel(state, finalShot);
  const prepLocked = hasHolePlayStarted(props.holeStats);
  const persistedPrepPlan = useMemo(() => sanitizeHolePrepPlan(props.holeStats.prepPlan), [props.holeStats.prepPlan]);
  const persistedPrepPlanKey = JSON.stringify(persistedPrepPlan);
  const prepDraftKey = JSON.stringify(prepDraft);
  const savedPrepPlanKey = JSON.stringify(savedPrepPlan);
  const prepIsDirty = prepDraftKey !== savedPrepPlanKey;

  useEffect(() => {
    setActiveTab('play');
  }, [hole]);

  useEffect(() => {
    if (lastLoadedHoleRef.current === hole) {
      return;
    }
    lastLoadedHoleRef.current = hole;
    setPrepDraft(persistedPrepPlan);
    setSavedPrepPlan(persistedPrepPlan);
    setPrepSaveState('saved');
  }, [hole, persistedPrepPlanKey]);

  const patchPrepPlan = (patch: Partial<HolePrepPlan>) => {
    const nextPrepPlan = { ...prepDraft, ...patch };
    const nextHoleStats = {
      ...props.holeStats,
      prepPlan: sanitizeHolePrepPlan(nextPrepPlan),
    };

    setPrepDraft(nextPrepPlan);
    setPrepSaveState('unsaved');
    props.onReplaceHoleStats(nextHoleStats);
  };

  const savePrepPlan = async () => {
    const nextHoleStats = {
      ...props.holeStats,
      prepPlan: sanitizeHolePrepPlan(prepDraft),
    };

    setPrepSaveState('saving');
    const didSave = props.onSaveHoleStats ? await props.onSaveHoleStats(nextHoleStats, { persistToServer: true }) : true;
    if (didSave) {
      setSavedPrepPlan(nextHoleStats.prepPlan);
    }
    setPrepSaveState(didSave ? 'saved' : 'error');
  };

  const headerActions = (
    <div className="virtual-caddy-tab-row" role="tablist" aria-label="Virtual caddy hole tabs">
      {!isFocusMode ? (
        <>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'play'}
            className={activeTab === 'play' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('play')}
          >
            Play
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'prep'}
            className={activeTab === 'prep' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('prep')}
          >
            Prep
          </button>
        </>
      ) : null}
      {props.onToggleFocusMode ? (
        <button type="button" className={isFocusMode ? 'tab-btn active virtual-caddy-focus-btn' : 'tab-btn virtual-caddy-focus-btn'} onClick={props.onToggleFocusMode}>
          {isFocusMode ? 'Exit focus' : 'Focus'}
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="track-distance-section virtual-caddy-section">
      <div className="virtual-caddy-panel active-panel">
        {activeTab === 'prep' ? (
          <PrepStep prepPlan={prepDraft} isLocked={prepLocked} saveState={prepSaveState} isDirty={prepIsDirty} headerActions={headerActions} onPatch={patchPrepPlan} onSave={() => void savePrepPlan()} />
        ) : !isHoleComplete ? (
          <>
            {isFirstShot && state.flowStep === 'overview' ? (
              <OverviewStep
                isFirstShot={isFirstShot}
                shotNumber={shotNumber}
                overviewTitle={overviewTitle}
                overviewDistanceSummary={overviewDistanceSummary}
                editingIndex={state.editingIndex}
                hole={hole}
                displayHoleIndex={displayHoleIndex}
                displayHolePar={displayHolePar}
                defaultDistanceMeters={defaultDistanceMeters}
                distanceToHoleMeters={state.distanceToHoleMeters}
                prepPlan={persistedPrepPlan}
                headerActions={headerActions}
                onCancelEdit={actions.cancelEdit}
                onNext={() => actions.setFlowStep('setup')}
              />
            ) : null}
            {state.flowStep === 'setup' ? (
              <SetupStep
                state={state}
                shotNumber={shotNumber}
                displayShotLabel={displayShotLabel}
                editingIndex={state.editingIndex}
                isPutting={isPutting}
                isStandardShot={state.actionType === 'tee' || state.actionType === 'shot'}
                showOopOptions={showOopOptions}
                shotDistanceBannerLabel={shotDistanceBannerLabel}
                shotDistanceBannerValue={shotDistanceBannerValue}
                canResetShotDistanceBanner={canResetShotDistanceBanner}
                distanceSliderMax={distanceSliderMax}
                headerActions={headerActions}
                onCancelEdit={actions.cancelEdit}
                onBack={isFirstShot ? () => actions.setFlowStep('overview') : null}
                onNext={() => actions.setFlowStep('action')}
                onResetBanner={() => {
                  if (state.distanceMode === 'point') {
                    actions.setShotDistance(state.distanceToHoleMeters);
                    return;
                  }
                  actions.setHoleDistance(state.seededDistanceMeters);
                }}
                onToggleAdvanced={() => actions.updateDraft({ showAdvanced: !state.showAdvanced })}
                onSetFlowStepAction={() => actions.setFlowStep('action')}
                onSetOopResult={(value) => actions.updateDraft({ oopResult: value })}
                onSetDistanceMode={actions.setDistanceMode}
                onSetHoleDistance={actions.setHoleDistance}
                onSetShotDistance={actions.setShotDistance}
                onToggleHazard={actions.toggleHazard}
                onPatch={actions.updateDraft}
              />
            ) : null}
            {state.flowStep === 'action' ? (
              <ExecuteStep
                state={state}
                shotNumber={shotNumber}
                editingIndex={state.editingIndex}
                isPutting={isPutting}
                isChipping={isChipping}
                isWedgeMatrixChip={Boolean(isChipping && baseRecommendation?.wedgeMatrixRecommendation)}
                recommendation={recommendation}
                baseRecommendationClub={baseRecommendation?.recommendedClub}
                visibleOverrideClubs={visibleOverrideClubs}
                canShowAllOverrideClubs={visibleOverrideClubs.length < displayedCarryBook.length}
                canOverrideClub={!isPutting}
                canOverrideOutcomeMode={canOverrideOutcomeMode}
                outcomeMode={outcomeMode}
                outcomeOptions={outcomeOptions}
                useCompassResultLayout={useCompassResultLayout}
                canSaveShot={canSaveShot}
                shotDistanceBannerLabel={shotDistanceBannerLabel}
                shotDistanceBannerValue={shotDistanceBannerValue}
                headerActions={headerActions}
                onCancelEdit={actions.cancelEdit}
                onBack={!isPutting ? () => actions.setFlowStep('setup') : null}
                onSave={() => void actions.saveShot()}
                onOpenWedgeMatrix={props.onOpenWedgeMatrix}
                onPatch={actions.updateState}
                onSelectClub={(club) => actions.updateState({ selectedClub: club, showClubOverride: false, showAllOverrideClubs: false })}
                onToggleOutcomeMode={() =>
                  actions.updateDraft({
                    resultModeOverride: outcomeMode === 'fairway' ? 'gir' : 'fairway',
                    outcomeSelection:
                      outcomeMode === 'fairway'
                        ? state.outcomeSelection?.startsWith('fairway')
                          ? null
                          : state.outcomeSelection
                        : state.outcomeSelection?.startsWith('gir')
                          ? null
                          : state.outcomeSelection,
                  })
                }
                onSetPuttCount={actions.setPuttCount}
                onSetPuttDetail={actions.setPuttDetail}
                onSetOutcomeSelection={(value) => actions.setOutcomeSelection(value as never)}
                onSetPenaltyStrokes={actions.setPenaltyStrokes}
              />
            ) : null}
            {hasCustomContext ? <p className="virtual-caddy-state-note">Recommendation adjusted for current conditions.</p> : null}
          </>
        ) : (
          <CompletionCard
            isHoleInOneFinish={isHoleInOneFinish}
            showHoledCelebration={showHoledCelebration}
            completionTitle={completionTitle}
            completionDetail={completionDetail}
            par={completedHoleSummary.par}
            score={completedHoleSummary.score}
            putts={completedHoleSummary.putts}
            tone={completedHoleSummary.style.tone}
            awaitingHoleAdvance={state.awaitingHoleAdvance}
            onNext={() => {
              actions.updateState({ awaitingHoleAdvance: false });
              void props.onHoleComplete?.(buildNextHoleStats(props.holeStats, state.baseHoleStats, state.trail, buildPersistedDraftFromState(state)), {
                persistToServer: false,
                advanceHole: true,
              });
            }}
          />
        )}
        <TrailList trail={state.trail} getTrailRecordedDistanceMeters={getTrailRecordedDistanceMeters} getTrailSummary={getTrailSummary} onStartEdit={actions.startEdit} />
      </div>
    </div>
  );
}
