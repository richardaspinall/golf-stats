import { OverviewStep } from './components/OverviewStep';
import { SetupStep } from './components/SetupStep';
import { ExecuteStep } from './components/ExecuteStep';
import { CompletionCard } from './components/CompletionCard';
import { TrailList } from './components/TrailList';
import { useVirtualCaddyController } from './hooks/useVirtualCaddyController';
import { buildNextHoleStats, buildPersistedDraftFromState } from './adapters/persistence';
import type { VirtualCaddyPanelProps } from './types';

export function VirtualCaddyFeature(props: VirtualCaddyPanelProps) {
  const { hole, displayHoleIndex = null, displayHolePar, defaultDistanceMeters } = props;
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
  const overviewTitle = isFirstShot ? 'Hole details' : 'Distance left';
  const overviewDistanceSummary = isFirstShot ? (defaultDistanceMeters != null ? `Length ${defaultDistanceMeters}m` : null) : `Distance left ${state.distanceToHoleMeters}m`;
  const shotDistanceBannerLabel = isPutting
    ? state.distanceToHoleMeters === 0
      ? 'On the green'
      : 'Distance left'
    : state.distanceMode === 'point'
      ? 'Distance to target'
      : 'Distance to green';
  const shotDistanceBannerValue = isPutting ? (state.distanceToHoleMeters === 0 ? null : `${state.distanceToHoleMeters}m`) : state.distanceMode === 'point' ? `${state.distanceToMiddleMeters}m` : `${state.distanceToHoleMeters}m`;
  const canResetShotDistanceBanner = state.distanceMode === 'point' ? state.distanceToMiddleMeters !== state.distanceToHoleMeters : state.distanceToHoleMeters !== state.seededDistanceMeters;
  const distanceSliderMax = Math.max(300, state.seededDistanceMeters, state.distanceToHoleMeters, state.distanceToMiddleMeters);
  const completionTitle = isHoleInOneFinish ? 'Hole in one' : finalShot?.outcomeSelection === 'girHoled' ? 'Holed out' : 'Hole summary';
  const completionDetail = isHoleInOneFinish
    ? `${finalShot?.club ?? 'Shot'} never left the cup.`
    : finalShot?.outcomeSelection === 'girHoled' && finalShot
      ? `Holed from ${finalShot.distanceStartMeters}m with ${finalShot.club}.`
      : null;

  return (
    <div className="track-distance-section virtual-caddy-section">
      <div className="virtual-caddy-panel active-panel">
        {!isHoleComplete ? (
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
                onCancelEdit={actions.cancelEdit}
                onNext={() => actions.dispatch({ type: 'setFlowStep', payload: 'setup' })}
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
                onCancelEdit={actions.cancelEdit}
                onBack={isFirstShot ? () => actions.dispatch({ type: 'setFlowStep', payload: 'overview' }) : null}
                onNext={() => actions.dispatch({ type: 'setFlowStep', payload: 'action' })}
                onResetBanner={() => {
                  if (state.distanceMode === 'point') {
                    actions.dispatch({ type: 'setShotDistance', payload: state.distanceToHoleMeters });
                    return;
                  }
                  actions.dispatch({ type: 'setHoleDistance', payload: state.seededDistanceMeters });
                }}
                onToggleAdvanced={() => actions.dispatch({ type: 'patchDraft', payload: { showAdvanced: !state.showAdvanced } })}
                onSetFlowStepAction={() => actions.dispatch({ type: 'setFlowStep', payload: 'action' })}
                onSetOopResult={(value) => actions.dispatch({ type: 'patchDraft', payload: { oopResult: value } })}
                onSetDistanceMode={(value) => actions.dispatch({ type: 'setDistanceMode', payload: value })}
                onSetHoleDistance={(value) => actions.dispatch({ type: 'setHoleDistance', payload: value })}
                onSetShotDistance={(value) => actions.dispatch({ type: 'setShotDistance', payload: value })}
                onToggleHazard={(hazard) => actions.dispatch({ type: 'toggleHazard', payload: hazard })}
                onPatch={(patch) => actions.dispatch({ type: 'patchDraft', payload: patch })}
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
                onCancelEdit={actions.cancelEdit}
                onBack={!isPutting ? () => actions.dispatch({ type: 'setFlowStep', payload: 'setup' }) : null}
                onSave={() => void actions.saveShot()}
                onPatch={(patch) => actions.dispatch({ type: 'patch', payload: patch })}
                onSelectClub={(club) => actions.dispatch({ type: 'patch', payload: { selectedClub: club, showClubOverride: false, showAllOverrideClubs: false } })}
                onToggleOutcomeMode={() =>
                  actions.dispatch({
                    type: 'patchDraft',
                    payload: {
                      resultModeOverride: outcomeMode === 'fairway' ? 'gir' : 'fairway',
                      outcomeSelection:
                        outcomeMode === 'fairway'
                          ? state.outcomeSelection?.startsWith('fairway')
                            ? null
                            : state.outcomeSelection
                          : state.outcomeSelection?.startsWith('gir')
                            ? null
                            : state.outcomeSelection,
                    },
                  })
                }
                onSetPuttCount={(count) => actions.dispatch({ type: 'setPuttCount', payload: count })}
                onSetPuttDetail={(key, value) => actions.dispatch({ type: 'setPuttDetail', payload: { key, value } })}
                onSetOutcomeSelection={(value) => actions.dispatch({ type: 'setOutcomeSelection', payload: value as never })}
                onSetPenaltyStrokes={(value) => actions.dispatch({ type: 'setPenaltyStrokes', payload: value })}
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
              actions.dispatch({ type: 'patch', payload: { awaitingHoleAdvance: false } });
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
