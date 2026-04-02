# Virtual Caddy Pre-Putt Distance Adjustment Plan

## Goal

When the shot before putting is measured to the flag, Virtual Caddy currently treats that measured distance as the shot's actual finish distance. That breaks down when the ball finishes short of the pin, long of the pin, or pin-high but left/right.

The feature should let the user adjust the leave relative to the pin so the next putting step starts from a better estimate of the first putt distance.

## Current Behavior

- The shot before putting stores:
  - `distanceStartMeters`
  - `plannedDistanceMeters`
  - `remainingDistanceMeters`
- The next step is decided in [`frontend/src/features/virtual-caddy/domain/shotLifecycle.ts`](/Users/richardaspinall/Developer/projects/golf-stats/frontend/src/features/virtual-caddy/domain/shotLifecycle.ts).
- When a shot result is `girHit`, the transition sets `remainingDistanceMeters = 0` and moves to putting.
- The putting step then defaults `firstPuttDistanceMeters` to `10` in [`frontend/src/features/virtual-caddy/hooks/useVirtualCaddyController.ts`](/Users/richardaspinall/Developer/projects/golf-stats/frontend/src/features/virtual-caddy/hooks/useVirtualCaddyController.ts).
- Club actual tracking for the previous shot is derived before save in the same controller, based on the current estimated finish distance.

## Proposed Product Behavior

- Keep the existing measured distance as the distance to the pin/target.
- When the user records a green-hit result, show a compact "leave relative to pin" control before saving.
- Let the user enter a signed adjustment:
  - Negative: finished short of pin
  - Positive: finished past pin
  - Zero: finished pin high
- Keep side miss as optional future scope. Left/right alone does not materially change first putt distance without another measure.
- Use the adjusted leave to seed the putting step's `firstPuttDistanceMeters`.
- Use the same adjusted leave when calculating the previous shot's actual distance for club tracking.

## Recommended UX

- Trigger only when all of these are true:
  - current shot is not putting
  - outcome mode is green
  - outcome selection is `girHit`
- Add a small card in [`frontend/src/features/virtual-caddy/components/ExecuteStep.tsx`](/Users/richardaspinall/Developer/projects/golf-stats/frontend/src/features/virtual-caddy/components/ExecuteStep.tsx):
  - Label: `Leave vs pin`
  - Current value: signed meters, default `0m`
  - Quick actions: `-10`, `-5`, `-2`, `+2`, `+5`, `+10`
  - Optional slider range: `-30m` to `+30m`
  - Helper copy: `Use negative for short of pin, positive for past pin.`
- Display a derived summary below:
  - `Estimated 1st putt: Xm`
- Do not show this control for `girHoled`, chip results, or fairway outcomes.

## State Design

Add a new draft field to persisted state:

- `greenLeavePinOffsetMeters: number`

Reasoning:

- This is draft state first, because the user sets it before saving the shot.
- It should persist in `virtualCaddyState.draft` so an in-progress hole survives refresh.
- It should also be copied onto the saved shot so trail editing restores it correctly.

Recommended `PlannerShot` addition:

- `greenLeavePinOffsetMeters?: number | null`

Files impacted:

- [`frontend/src/features/virtual-caddy/types.ts`](/Users/richardaspinall/Developer/projects/golf-stats/frontend/src/features/virtual-caddy/types.ts)
- [`frontend/src/features/virtual-caddy/state/reducer.ts`](/Users/richardaspinall/Developer/projects/golf-stats/frontend/src/features/virtual-caddy/state/reducer.ts)
- [`frontend/src/features/virtual-caddy/adapters/persistence.ts`](/Users/richardaspinall/Developer/projects/golf-stats/frontend/src/features/virtual-caddy/adapters/persistence.ts)

## Calculation Rules

### 1. Estimate first putt distance

For a green-hit shot:

- `pinDistanceMeters = max(0, distanceToHoleMeters - plannedDistanceMeters)` when `distanceMode === 'point'`
- otherwise the existing green-hit flow already assumes the target was the hole, so `pinDistanceMeters = 0`
- `estimatedLeaveMeters = abs(pinDistanceMeters + greenLeavePinOffsetMeters)`

In practice, the useful case is `distanceMode === 'point'`, because that is when the user measured to the flag instead of the front/middle of green.

Examples:

- 120m to pin, planned/measured target 120m, leave `-8m` => first putt `8m`
- 120m to pin, planned/measured target 120m, leave `+6m` => first putt `6m`
- 140m to hole, 128m to front/target, leave offset `0m` => still uses the existing post-shot flow

### 2. Persist previous shot actual distance

The previous shot's actual distance should reflect the real finish point, not the pin reference.

Suggested formula for the save path in [`frontend/src/features/virtual-caddy/hooks/useVirtualCaddyController.ts`](/Users/richardaspinall/Developer/projects/golf-stats/frontend/src/features/virtual-caddy/hooks/useVirtualCaddyController.ts):

- derive `leaveDistanceMeters` from the signed offset when `outcomeSelection === 'girHit'`
- `actualDistanceMeters = max(0, distanceStartMeters - leaveDistanceMeters)`

That keeps club actual distances closer to reality for approach shots that finish past or short of the flag.

### 3. Transition to putting

The shot lifecycle should still move to putting on `girHit`, but it needs to carry the estimated leave into the next draft instead of forcing the generic default of `10m`.

Recommended change:

- keep `remainingDistanceMeters = 0` for score-flow purposes
- separately pass `nextFirstPuttDistanceMeters`
- seed the next draft with that value

This avoids overloading `remainingDistanceMeters`, which currently means "distance left to hole before the next full shot state."

## Implementation Outline

1. Extend draft and shot types with `greenLeavePinOffsetMeters`.
2. Initialize/reset/hydrate/persist that field in reducer and persistence helpers.
3. Show the control in `ExecuteStep` only for `girHit`.
4. Add a small selector/helper for derived estimated leave text if needed.
5. Update `saveShot` in the controller:
   - include the offset on the saved shot
   - compute `actualDistanceMeters` using adjusted leave
   - seed `firstPuttDistanceMeters` for the next putting draft from adjusted leave
6. Update edit flow so editing a green-hit approach restores the offset value.
7. Update trail summary only if useful; not required for first pass.

## Tests To Add

- Reducer tests:
  - default/reset state includes `greenLeavePinOffsetMeters = 0`
  - edit/hydrate restores saved offset
- Controller tests:
  - `girHit` with `-8` seeds next putting draft with `8m`
  - `girHit` with `+6` seeds next putting draft with `6m`
  - club actual distance uses adjusted leave instead of zero
- UI tests:
  - leave control appears only for green-hit flow
  - quick actions update the derived first-putt estimate

Likely files:

- [`frontend/src/features/virtual-caddy/state/reducer.test.ts`](/Users/richardaspinall/Developer/projects/golf-stats/frontend/src/features/virtual-caddy/state/reducer.test.ts)
- [`frontend/src/components/pages/VirtualCaddyPage.test.tsx`](/Users/richardaspinall/Developer/projects/golf-stats/frontend/src/components/pages/VirtualCaddyPage.test.tsx)
- [`frontend/src/lib/virtualCaddyExecution.test.ts`](/Users/richardaspinall/Developer/projects/golf-stats/frontend/src/lib/virtualCaddyExecution.test.ts)

## Open Decisions

- Whether to support side-of-pin distance in v1.
  - Recommendation: no, unless the user wants a 2-axis leave estimator.
- Whether the control should appear for `chipOnGreen`.
  - Recommendation: no in v1. Chips already transition with a fixed short-game assumption and the user can edit first putt distance on the putting step.
- Whether the trail should show `Pin +6m` / `Pin -8m`.
  - Recommendation: yes eventually, but not required for the first implementation.

## Recommended Scope For First Build

Ship the smallest version that improves the putting estimate without destabilizing the flow:

- signed pin-offset input for `girHit`
- adjusted seed for `firstPuttDistanceMeters`
- adjusted club actual distance
- persisted edit support
- targeted tests
