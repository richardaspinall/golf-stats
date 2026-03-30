/** @vitest-environment jsdom */

import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VirtualCaddyPanel } from './VirtualCaddyPanel';
import { emptyHoleStats } from '../lib/rounds';

afterEach(() => {
  cleanup();
});

const getVisibleDistanceValue = () =>
  document.querySelector('.distance-header-actions strong')?.textContent ?? document.querySelector('.distance-header strong')?.textContent ?? '';

describe('VirtualCaddyPanel', () => {
  it('starts with a tee shot and clubs up to the carry number', async () => {
    render(<VirtualCaddyPanel hole={1} holeStats={emptyHoleStats()} displayHolePar={4} defaultDistanceMeters={150} onReplaceHoleStats={vi.fn()} />);

    expect(screen.getByText('Tee shot')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Override club' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Virtual caddy club selection' })).toBeNull();
    expect(screen.queryByText('Selected club')).toBeNull();
    expect(screen.getByText('(150m carry)')).toBeTruthy();
    expect(screen.getAllByText('Actual distance left').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('Effective')).toBeNull();
  });

  it('updates the recommendation when advanced context changes on later shots', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={1} holeStats={emptyHoleStats()} displayHolePar={4} defaultDistanceMeters={150} onReplaceHoleStats={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Add detail' }));
    await user.click(screen.getByRole('button', { name: 'Rough' }));
    await user.click(screen.getByRole('button', { name: 'Uphill' }));
    await user.click(screen.getByRole('button', { name: 'Trouble left' }));

    expect(screen.getByText('(170m carry)')).toBeTruthy();
    expect(screen.getAllByText('Actual distance left').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Effective')).toBeTruthy();
    expect(getVisibleDistanceValue()).toBe('150m');
    expect(screen.getByText('Left-side trouble: bias the target slightly right of center.')).toBeTruthy();
  });

  it('lets you override the recommended club and saves the chosen club', async () => {
    const user = userEvent.setup();
    const onSaveClubActual = vi.fn(async () => 77);

    render(
      <VirtualCaddyPanel
        hole={1}
        holeStats={emptyHoleStats()}
        displayHolePar={4}
        defaultDistanceMeters={150}
        onReplaceHoleStats={vi.fn()}
        onSaveClubActual={onSaveClubActual}
      />,
    );

    expect(screen.getByRole('button', { name: 'Override club' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Virtual caddy club selection' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Override club' }));
    expect(screen.getByRole('button', { name: 'Hide override' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Driver' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Show all clubs' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Show all clubs' }));
    expect(screen.getByRole('button', { name: 'Driver' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '7i' }));

    expect(screen.getByText('Recommended: 6i')).toBeTruthy();
    expect(screen.getByText('(140m carry)')).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Virtual caddy club selection' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Override club' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Recommended: 6i' }));

    expect(screen.queryByText('Recommended: 6i')).toBeNull();
    expect(screen.getByText('(150m carry)')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText((_, element) => element?.textContent === '6i · 150m')).toBeTruthy();
    expect(onSaveClubActual).toHaveBeenCalledWith({ club: '6i', actualMeters: 150 });
  });

  it('warns before saving when the score was manually entered on the track page', async () => {
    const user = userEvent.setup();
    const onSaveHoleStats = vi.fn(async () => true);
    const confirmSpy = vi.spyOn(window, 'confirm');
    confirmSpy.mockReturnValueOnce(false).mockReturnValueOnce(true);

    render(
      <VirtualCaddyPanel
        hole={1}
        holeStats={{ ...emptyHoleStats(), manualScoreEnteredOnTrack: true }}
        displayHolePar={4}
        defaultDistanceMeters={150}
        onReplaceHoleStats={vi.fn()}
        onSaveHoleStats={onSaveHoleStats}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(onSaveHoleStats).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(onSaveHoleStats).toHaveBeenCalledTimes(1);
    expect(onSaveHoleStats.mock.calls[0]?.[0]?.manualScoreEnteredOnTrack).toBe(false);

    confirmSpy.mockRestore();
  });

  it('shows bunker-specific lie options and updates the recommendation from them', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={1} holeStats={emptyHoleStats()} displayHolePar={4} defaultDistanceMeters={80} onReplaceHoleStats={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Add detail' }));
    await user.click(screen.getByRole('button', { name: 'Bunker' }));

    expect(screen.getByText('Bunker lie')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Buried' }));

    expect(screen.getByText('(110m carry)')).toBeTruthy();
    expect(screen.getByText('Effective')).toBeTruthy();
    expect(getVisibleDistanceValue()).toBe('80m');
    expect(screen.getByText('Bunker lie: buried +8m')).toBeTruthy();
  });

  it('uses the active wedge matrix for shots inside 100m', () => {
    render(
      <VirtualCaddyPanel
        hole={1}
        holeStats={emptyHoleStats()}
        displayHolePar={4}
        defaultDistanceMeters={84}
        wedgeMatrices={[
          {
            id: 1,
            name: 'Stock wedges',
            stanceWidth: 'Medium',
            grip: 'Mid',
            ballPosition: 'Middle',
            notes: '',
            clubs: ['PW', '50w', '56w', '60w'],
            swingClocks: ['7:30', '9:00', '10:30', 'Full'],
            createdAt: '2026-03-30T00:00:00Z',
          },
        ]}
        wedgeEntriesByMatrix={{
          1: [
            { id: 1, matrixId: 1, club: '56w', swingClock: '9:00', distanceMeters: 82, createdAt: '2026-03-30T00:00:00Z' },
            { id: 2, matrixId: 1, club: '56w', swingClock: '9:00', distanceMeters: 84, createdAt: '2026-03-30T00:00:00Z' },
          ],
        }}
        onReplaceHoleStats={vi.fn()}
      />,
    );

    expect(screen.getByText('(83m carry)')).toBeTruthy();
    expect(screen.getByText('9:00 · Stock wedges')).toBeTruthy();
    expect(screen.getByText('Stance: Medium | Grip: Mid | Ball position: Middle')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Override club' })).toBeNull();
  });

  it('adds an executed shot to the trail and seeds the next shot', async () => {
    const user = userEvent.setup();
    const onReplaceHoleStats = vi.fn();

    render(<VirtualCaddyPanel hole={4} holeStats={emptyHoleStats()} displayHolePar={4} defaultDistanceMeters={420} onReplaceHoleStats={onReplaceHoleStats} />);

    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Shot 2')).toBeTruthy();
    expect(screen.getByText('Driver · 230m')).toBeTruthy();
    expect(getVisibleDistanceValue()).toBe('190m');
    expect(onReplaceHoleStats).toHaveBeenCalled();
  });

  it('supports laying up to a point while keeping the full hole distance for the next shot', async () => {
    const user = userEvent.setup();

    render(
      <VirtualCaddyPanel
        hole={4}
        holeStats={emptyHoleStats()}
        displayHolePar={4}
        defaultDistanceMeters={250}
        carryByClub={{ Driver: 200, '3 wood': 190, '5 wood': 170, '6i': 150, '8i': 130, PW: 100, '50': 80, '56': 60 }}
        onReplaceHoleStats={vi.fn()}
      />,
    );

    expect(getVisibleDistanceValue()).toBe('250m');

    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '170' } });
    await user.click(screen.getByRole('button', { name: 'To target' }));

    expect(screen.getByText('(170m carry)')).toBeTruthy();
    expect(screen.getByText('Fairway result')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('heading', { name: 'Shot 2' })).toBeTruthy();
    expect(getVisibleDistanceValue()).toBe('80m');
    expect(screen.getByText('5 wood · 170m')).toBeTruthy();
  });

  it('rehydrates the trail and current shot from persisted hole state', () => {
    const baseHoleStats = emptyHoleStats();

    render(
      <VirtualCaddyPanel
        hole={4}
        holeStats={{
          ...baseHoleStats,
          score: 1,
          fairwaySelection: 'fairwayHit',
          virtualCaddyState: {
            version: 1,
            baseHoleStats,
            trail: [
              {
                id: 1,
                hole: 4,
                label: 'Tee shot',
                actionType: 'tee',
                distanceStartMeters: 400,
                plannedDistanceMeters: 400,
                remainingDistanceMeters: 170,
                distanceMode: 'hole',
                surface: 'tee',
                lieQuality: 'good',
                slope: 'flat',
                bunkerLie: 'clean',
                temperature: 'normal',
                windDirection: 'none',
                windStrength: 'calm',
                hazards: [],
                club: 'Driver',
                carryMeters: 230,
                scoreDelta: 1,
                oopResult: 'none',
                shotCategory: 'none',
                inside100Over3: 0,
                outcomeSelection: 'fairwayHit',
                puttCount: null,
              },
            ],
            draft: {
              nextShotId: 2,
              actionType: 'shot',
              seededDistanceMeters: 170,
              distanceToMiddleMeters: 170,
              distanceMode: 'hole',
              surface: 'fairway',
              lieQuality: 'good',
              slope: 'flat',
              bunkerLie: 'clean',
              temperature: 'normal',
              windDirection: 'none',
              windStrength: 'calm',
              hazards: [],
              oopResult: 'none',
              outcomeSelection: null,
              puttCount: null,
              showAdvanced: false,
            },
          },
        }}
        displayHolePar={4}
        defaultDistanceMeters={400}
        onReplaceHoleStats={vi.fn()}
      />,
    );

    expect(screen.getByText('Driver · 230m')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Shot 2' })).toBeTruthy();
    expect(getVisibleDistanceValue()).toBe('170m');
  });

  it('updates the previous trail distance when the next remaining distance is adjusted', async () => {
    const user = userEvent.setup();

    render(
      <VirtualCaddyPanel
        hole={4}
        holeStats={emptyHoleStats()}
        displayHolePar={4}
        defaultDistanceMeters={400}
        carryByClub={{ Driver: 200, 'Mini Driver': 200, '3 wood': 190, '5 wood': 180, '5Hy': 180, '4i': 170, '5i': 160, '6i': 150 }}
        onReplaceHoleStats={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText((_, element) => element?.textContent === 'Driver · 200m' || element?.textContent === 'Mini Driver · 200m')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '180' } });

    expect(screen.getByText((_, element) => element?.textContent === 'Driver · 220m' || element?.textContent === 'Mini Driver · 220m')).toBeTruthy();
    expect(screen.getByText(/Started at 400m with 200m carry\. Fairway hit\./)).toBeTruthy();
  });

  it('does not update the previous trail distance when only the point target changes', async () => {
    const user = userEvent.setup();

    render(
      <VirtualCaddyPanel
        hole={4}
        holeStats={emptyHoleStats()}
        displayHolePar={4}
        defaultDistanceMeters={250}
        carryByClub={{ Driver: 200, '3 wood': 190, '5 wood': 170, '6i': 150, '8i': 130, PW: 100, '50': 80, '56': 60 }}
        onReplaceHoleStats={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '170' } });
    await user.click(screen.getByRole('button', { name: 'To target' }));
    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText((_, element) => element?.textContent === '5 wood · 170m')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'To target' }));
    fireEvent.change(screen.getByLabelText('Virtual caddy distance to target'), { target: { value: '40' } });

    expect(screen.getByText((_, element) => element?.textContent === '5 wood · 170m')).toBeTruthy();
    const headers = Array.from(document.querySelectorAll('.distance-header'));
    expect(headers[0]?.textContent).toContain('Distance to green');
    expect(headers[0]?.textContent).toContain('80m');
    expect(headers[1]?.textContent).toContain('Distance to target');
    expect(headers[1]?.textContent).toContain('40m');
  });

  it('moves from a green hit into putting', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={3} holeStats={emptyHoleStats()} displayHolePar={3} defaultDistanceMeters={150} onReplaceHoleStats={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const puttsGroup = screen.getByRole('group', { name: 'Virtual caddy putts selection' });
    expect(screen.getByRole('heading', { name: 'Putting' })).toBeTruthy();
    expect(screen.getByText('Putter')).toBeTruthy();
    expect(screen.getByText('Finish out')).toBeTruthy();
    expect(screen.getByText('Putts')).toBeTruthy();
    expect(within(puttsGroup).getByRole('button', { name: '1' })).toBeTruthy();
    expect(within(puttsGroup).getByRole('button', { name: '2' })).toBeTruthy();
    expect(within(puttsGroup).getByRole('button', { name: '3' })).toBeTruthy();
    expect(within(puttsGroup).getByRole('button', { name: 'Add more than 3 putts' })).toBeTruthy();
  });

  it('records putt count into the trail and hole stats', async () => {
    const user = userEvent.setup();
    const onReplaceHoleStats = vi.fn();

    render(<VirtualCaddyPanel hole={3} holeStats={emptyHoleStats()} displayHolePar={3} defaultDistanceMeters={150} onReplaceHoleStats={onReplaceHoleStats} />);

    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(within(screen.getByRole('group', { name: 'Virtual caddy putts selection' })).getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Trail complete')).toBeTruthy();
    expect(screen.getByText(/Started at 0m with 0m carry\. 2 putts\./)).toBeTruthy();

    const lastCall = onReplaceHoleStats.mock.calls.at(-1)?.[0];
    expect(lastCall?.score).toBe(3);
    expect(lastCall?.totalPutts).toBe(2);
  });

  it('records putting detailed stats into the hole totals', async () => {
    const user = userEvent.setup();
    const onReplaceHoleStats = vi.fn();

    render(<VirtualCaddyPanel hole={3} holeStats={emptyHoleStats()} displayHolePar={3} defaultDistanceMeters={150} onReplaceHoleStats={onReplaceHoleStats} />);

    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(within(screen.getByRole('group', { name: 'Virtual caddy putts selection' })).getByRole('button', { name: '2' }));
    expect(screen.queryByRole('group', { name: 'Miss long value' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Add detail' }));
    await user.click(within(screen.getByRole('group', { name: 'Miss long value' })).getByRole('button', { name: '1' }));
    await user.click(within(screen.getByRole('group', { name: 'Miss within 2m value' })).getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const lastCall = onReplaceHoleStats.mock.calls.at(-1)?.[0];
    expect(lastCall?.totalPutts).toBe(2);
    expect(lastCall?.puttMissLong).toBe(1);
    expect(lastCall?.puttMissWithin2m).toBe(2);
  });

  it('keeps putting detailed stats collapsed until opened', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={3} holeStats={emptyHoleStats()} displayHolePar={3} defaultDistanceMeters={150} onReplaceHoleStats={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.queryByRole('group', { name: 'Miss long value' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Add detail' }));

    expect(screen.getByRole('group', { name: 'Miss long value' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hide detail' })).toBeTruthy();
  });

  it('supports custom putt counts above 3 with a plus button', async () => {
    const user = userEvent.setup();
    const onReplaceHoleStats = vi.fn();

    render(<VirtualCaddyPanel hole={3} holeStats={emptyHoleStats()} displayHolePar={3} defaultDistanceMeters={150} onReplaceHoleStats={onReplaceHoleStats} />);

    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const puttsGroup = screen.getByRole('group', { name: 'Virtual caddy putts selection' });
    await user.click(within(puttsGroup).getByRole('button', { name: 'Add more than 3 putts' }));
    await user.click(within(puttsGroup).getByRole('button', { name: 'Add more than 3 putts' }));

    expect(screen.getByRole('button', { name: 'Decrease custom putts value' }).textContent).toBe('5');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    const lastCall = onReplaceHoleStats.mock.calls.at(-1)?.[0];
    expect(lastCall?.score).toBe(6);
    expect(lastCall?.totalPutts).toBe(5);
  });

  it('moves from a missed green into chipping', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={3} holeStats={emptyHoleStats()} displayHolePar={3} defaultDistanceMeters={150} onReplaceHoleStats={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Left' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Chipping')).toBeTruthy();
    expect(screen.getByText('Chip shot')).toBeTruthy();
  });

  it('uses the wedge matrix when a chip shot is the next action', async () => {
    const user = userEvent.setup();

    render(
      <VirtualCaddyPanel
        hole={3}
        holeStats={emptyHoleStats()}
        displayHolePar={3}
        defaultDistanceMeters={150}
        wedgeMatrices={[
          {
            id: 1,
            name: 'Stock wedges',
            stanceWidth: 'Medium',
            grip: 'Mid',
            ballPosition: 'Middle',
            notes: '',
            clubs: ['PW', '50w', '56w', '60w'],
            swingClocks: ['7:30', '9:00', '10:30', 'Full'],
            createdAt: '2026-03-30T00:00:00Z',
          },
        ]}
        wedgeEntriesByMatrix={{
          1: [
            { id: 1, matrixId: 1, club: '60w', swingClock: '7:30', distanceMeters: 18, createdAt: '2026-03-30T00:00:00Z' },
            { id: 2, matrixId: 1, club: '60w', swingClock: '7:30', distanceMeters: 20, createdAt: '2026-03-30T00:00:00Z' },
          ],
        }}
        onReplaceHoleStats={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Left' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Chipping')).toBeTruthy();
    expect(screen.getByText('60w')).toBeTruthy();
    expect(screen.getByText('(19m carry)')).toBeTruthy();
    expect(screen.getByText('7:30 · Stock wedges')).toBeTruthy();
    expect(screen.getByText('Stance: Medium | Grip: Mid | Ball position: Middle')).toBeTruthy();
  });

  it('picks the best match from all wedge matrices', () => {
    render(
      <VirtualCaddyPanel
        hole={1}
        holeStats={emptyHoleStats()}
        displayHolePar={4}
        defaultDistanceMeters={47}
        wedgeMatrices={[
          {
            id: 1,
            name: 'Stock wedges',
            stanceWidth: 'Medium',
            grip: 'Mid',
            ballPosition: 'Middle',
            notes: '',
            clubs: ['PW', '50w', '56w', '60w'],
            swingClocks: ['7:30', '9:00', '10:30', 'Full'],
            createdAt: '2026-03-30T00:00:00Z',
          },
          {
            id: 2,
            name: 'Flighted',
            stanceWidth: 'Narrow',
            grip: 'Low',
            ballPosition: 'Back',
            notes: '',
            clubs: ['PW', '50w', '56w', '60w'],
            swingClocks: ['7:30', '9:00', '10:30', 'Full'],
            createdAt: '2026-03-30T00:00:00Z',
          },
        ]}
        wedgeEntriesByMatrix={{
          1: [{ id: 1, matrixId: 1, club: '60w', swingClock: '7:30', distanceMeters: 38, createdAt: '2026-03-30T00:00:00Z' }],
          2: [{ id: 2, matrixId: 2, club: '56w', swingClock: '7:30', distanceMeters: 46, createdAt: '2026-03-30T00:00:00Z' }],
        }}
        onReplaceHoleStats={vi.fn()}
      />,
    );

    expect(screen.getByText('56w')).toBeTruthy();
    expect(screen.getByText('7:30 · Flighted')).toBeTruthy();
    expect(screen.getByText('Stance: Narrow | Grip: Low | Ball position: Back')).toBeTruthy();
  });

  it('does not show the previous-result chip in the action card', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={4} holeStats={emptyHoleStats()} displayHolePar={4} defaultDistanceMeters={420} onReplaceHoleStats={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Right' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.queryByText('Fairway right')).toBeNull();
  });

  it('shows OOP options with the distance controls on the next shot when out of position', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={4} holeStats={emptyHoleStats()} displayHolePar={4} defaultDistanceMeters={420} onReplaceHoleStats={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Right' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Out of position')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Look' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'No look' })).toBeTruthy();
    expect(screen.getByLabelText('Virtual caddy distance to hole')).toBeTruthy();
  });

  it('shows OOP options after the second shot unless the green was hit', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={5} holeStats={emptyHoleStats()} displayHolePar={5} defaultDistanceMeters={500} onReplaceHoleStats={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Out of position')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'No' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Look' })).toBeTruthy();
  });

  it('switches to chipping below 40m', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={4} holeStats={emptyHoleStats()} displayHolePar={4} defaultDistanceMeters={420} onReplaceHoleStats={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '39' } });

    expect(screen.getByRole('heading', { name: 'Chipping' })).toBeTruthy();
    expect(screen.getByText('Chip shot')).toBeTruthy();
  });

  it('resets the distance to the seeded value for the current shot', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={4} holeStats={emptyHoleStats()} displayHolePar={4} defaultDistanceMeters={420} onReplaceHoleStats={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '300' } });
    expect((screen.getByLabelText('Virtual caddy distance to hole') as HTMLInputElement).value).toBe('300');

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(getVisibleDistanceValue()).toBe('420m');

    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '150' } });
    expect((screen.getByLabelText('Virtual caddy distance to hole') as HTMLInputElement).value).toBe('150');

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(getVisibleDistanceValue()).toBe('190m');
  });

  it('nudges the distance with 1m and 5m buttons around the slider', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={1} holeStats={emptyHoleStats()} displayHolePar={4} defaultDistanceMeters={150} onReplaceHoleStats={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '+5m' }));
    expect(getVisibleDistanceValue()).toBe('155m');

    await user.click(screen.getByRole('button', { name: '-1m' }));
    expect(getVisibleDistanceValue()).toBe('154m');

    await user.click(screen.getByRole('button', { name: '-5m' }));
    expect(getVisibleDistanceValue()).toBe('149m');

    await user.click(screen.getByRole('button', { name: '+1m' }));
    expect(getVisibleDistanceValue()).toBe('150m');
  });

  it('keeps you in chipping after a chip misses the green', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={3} holeStats={emptyHoleStats()} displayHolePar={3} defaultDistanceMeters={150} onReplaceHoleStats={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Left' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await user.click(screen.getByRole('button', { name: 'Miss green' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('heading', { name: 'Chipping' })).toBeTruthy();
    expect(screen.getByText('Chip shot')).toBeTruthy();
  });

  it('promotes chipping back to a full shot when the distance is updated higher', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={4} holeStats={emptyHoleStats()} displayHolePar={4} defaultDistanceMeters={420} onReplaceHoleStats={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '150' } });
    await user.click(screen.getByRole('button', { name: 'Left' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('heading', { name: 'Chipping' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '140' } });

    expect(screen.getByRole('heading', { name: 'Shot 3' })).toBeTruthy();
    expect(screen.getByText('(150m carry)')).toBeTruthy();
    expect(screen.getAllByText('Actual distance left').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Effective')).toBeTruthy();
  });

  it('keeps detail and result buttons visible after parent hole stats updates', async () => {
    const user = userEvent.setup();

    function TestHarness() {
      const [holeStats, setHoleStats] = useState(emptyHoleStats());

      return (
        <VirtualCaddyPanel
          hole={1}
          holeStats={holeStats}
          displayHolePar={4}
          defaultDistanceMeters={420}
          onReplaceHoleStats={setHoleStats}
        />
      );
    }

    render(<TestHarness />);

    await user.click(screen.getByRole('button', { name: 'Add detail' }));
    expect(screen.getByRole('button', { name: 'Rough' })).toBeTruthy();

    expect(screen.getByRole('button', { name: 'Fairway hit' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('disables save during edit until a change is made and supports cancel', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={4} holeStats={emptyHoleStats()} displayHolePar={4} defaultDistanceMeters={420} onReplaceHoleStats={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('heading', { name: 'Shot 2' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Cancel edit' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Left' }));
    expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Cancel edit' }));

    expect(screen.getByRole('heading', { name: 'Shot 2' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancel edit' })).toBeNull();
  });

  it('logs club actuals on save and replaces them on edit', async () => {
    const user = userEvent.setup();
    const onSaveClubActual = vi
      .fn<(...args: Array<{ club: string; actualMeters: number }>) => Promise<number | null>>()
      .mockResolvedValueOnce(101)
      .mockResolvedValueOnce(202);
    const onDeleteClubActualEntry = vi.fn(async () => {});

    render(
      <VirtualCaddyPanel
        hole={4}
        holeStats={emptyHoleStats()}
        displayHolePar={4}
        defaultDistanceMeters={400}
        carryByClub={{ Driver: 200, 'Mini Driver': 190, '3 wood': 180 }}
        onReplaceHoleStats={vi.fn()}
        onSaveClubActual={onSaveClubActual}
        onDeleteClubActualEntry={onDeleteClubActualEntry}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSaveClubActual).toHaveBeenCalledWith({ club: 'Driver', actualMeters: 200 });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '180' } });
    await user.click(screen.getByRole('button', { name: 'Left' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onDeleteClubActualEntry).toHaveBeenCalledWith(101);
    expect(onSaveClubActual).toHaveBeenLastCalledWith({ club: 'Driver', actualMeters: 170 });
  });
});
