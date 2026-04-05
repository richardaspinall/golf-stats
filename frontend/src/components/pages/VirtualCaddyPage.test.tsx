/** @vitest-environment jsdom */

import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VirtualCaddyPage } from './VirtualCaddyPage';
import { buildInitialByHole } from '../../lib/rounds';

afterEach(() => {
  cleanup();
});

describe('VirtualCaddyPage', () => {
  const statsByHole = buildInitialByHole();

  it('hides extra page chrome in focus mode', async () => {
    render(
      <VirtualCaddyPage
        round={{
          selectedHole: 4,
          displayHoleIndex: 7,
          displayHolePar: 4,
          activeRound: { id: 'r1', name: 'Morning Round' },
          activeCourse: { id: 'c1', name: 'Royal Test', markers: {} as never },
          statsByHole,
          holeStats: {
            score: 4,
            holeIndex: 7,
            fairwaySelection: 'fairwayHit',
            girSelection: 'girHit',
            teePosition: null,
            greenPosition: null,
          },
          saveState: 'saved',
          teeToGreenMeters: 152,
          clubCarryByClub: {},
          wedgeMatrices: [],
          wedgeEntriesByMatrix: {},
          isFocusMode: true,
        }}
        actions={{
          setSelectedHole: vi.fn(),
          saveCurrentRound: vi.fn(async () => true),
          replaceHoleStats: vi.fn(),
          saveHoleStats: vi.fn(async () => true),
          saveClubActual: vi.fn(async () => null),
          deleteClubActualEntry: vi.fn(async () => {}),
          onToggleFocusMode: vi.fn(),
        }}
      />,
    );

    expect(screen.getByLabelText('hole picker')).toBeTruthy();
    expect(screen.getByLabelText('hole picker')).toBeTruthy();
    const caddyRegion = screen.getByLabelText('virtual caddy');
    expect(within(caddyRegion).getByRole('heading', { name: 'Hole details' })).toBeTruthy();
    expect(within(caddyRegion).getByText('Index')).toBeTruthy();
    expect(within(caddyRegion).getByText('7')).toBeTruthy();
    expect(within(caddyRegion).getByText('152m')).toBeTruthy();
    expect(within(caddyRegion).getAllByText('4').length).toBeGreaterThan(0);
    expect(screen.queryByText(/focus mode/i)).toBeNull();
  });

  it('keeps the focus toggle visible on a completed hole summary', () => {
    render(
      <VirtualCaddyPage
        round={{
          selectedHole: 4,
          displayHoleIndex: 7,
          displayHolePar: 4,
          activeRound: { id: 'r1', name: 'Morning Round' },
          activeCourse: { id: 'c1', name: 'Royal Test', markers: {} as never },
          statsByHole: {
            ...statsByHole,
            4: {
              ...statsByHole[4],
              score: 4,
              totalPutts: 2,
              quickEntrySaved: true,
              virtualCaddyState: null,
            },
          },
          holeStats: {
            ...statsByHole[4],
            score: 4,
            totalPutts: 2,
            quickEntrySaved: true,
            virtualCaddyState: null,
          },
          saveState: 'saved',
          teeToGreenMeters: 152,
          clubCarryByClub: {},
          wedgeMatrices: [],
          wedgeEntriesByMatrix: {},
          isFocusMode: false,
        }}
        actions={{
          setSelectedHole: vi.fn(),
          saveCurrentRound: vi.fn(async () => true),
          replaceHoleStats: vi.fn(),
          saveHoleStats: vi.fn(async () => true),
          saveClubActual: vi.fn(async () => null),
          deleteClubActualEntry: vi.fn(async () => {}),
          onToggleFocusMode: vi.fn(),
        }}
      />,
    );

    expect(screen.getByRole('button', { name: 'Focus' })).toBeTruthy();
    expect(screen.getByText('Hole summary')).toBeTruthy();
  });

  it('only saves club actuals once the hole is completed', async () => {
    const user = userEvent.setup();
    const saveHoleStats = vi.fn(async () => true);
    const saveClubActual = vi.fn(async () => 99);

    render(
      <VirtualCaddyPage
        round={{
          selectedHole: 4,
          displayHoleIndex: 7,
          displayHolePar: 4,
          activeRound: { id: 'r1', name: 'Morning Round' },
          activeCourse: { id: 'c1', name: 'Royal Test', markers: {} as never },
          statsByHole,
          holeStats: {
            score: 0,
            holeIndex: 7,
            fairwaySelection: null,
            girSelection: null,
            teePosition: null,
            greenPosition: null,
          },
          saveState: 'saved',
          teeToGreenMeters: 400,
          clubCarryByClub: { Driver: 200, 'Mini Driver': 190, '3 wood': 180 },
          wedgeMatrices: [],
          wedgeEntriesByMatrix: {},
          isFocusMode: false,
        }}
        actions={{
          setSelectedHole: vi.fn(),
          saveCurrentRound: vi.fn(async () => true),
          replaceHoleStats: vi.fn(),
          saveHoleStats,
          saveClubActual,
          deleteClubActualEntry: vi.fn(async () => {}),
          onToggleFocusMode: vi.fn(),
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    expect(saveHoleStats).toHaveBeenCalledTimes(1);
    expect(saveHoleStats).toHaveBeenLastCalledWith(4, expect.any(Object), undefined);
    expect(saveClubActual).not.toHaveBeenCalled();
  });

  it('advances to the next hole before the hole save finishes', async () => {
    const user = userEvent.setup();

    function StatefulPage() {
      const [selectedHole, setSelectedHole] = useState(1);
      const [localStatsByHole, setLocalStatsByHole] = useState(() => buildInitialByHole());

      return (
        <VirtualCaddyPage
          round={{
            selectedHole,
            displayHoleIndex: selectedHole,
            displayHolePar: 4,
            activeRound: { id: 'r1', name: 'Morning Round' },
            activeCourse: { id: 'c1', name: 'Royal Test', markers: {} as never },
            statsByHole: localStatsByHole,
            holeStats: localStatsByHole[selectedHole],
            saveState: 'saved',
            teeToGreenMeters: 150,
            clubCarryByClub: {},
            wedgeMatrices: [],
            wedgeEntriesByMatrix: {},
            isFocusMode: false,
          }}
          actions={{
            setSelectedHole,
            saveCurrentRound: vi.fn(async () => true),
            replaceHoleStats: (hole, nextHoleStats) => {
              setLocalStatsByHole((prev) => ({ ...prev, [hole]: nextHoleStats }));
            },
            saveHoleStats: vi.fn(async (hole, nextHoleStats, options) => {
              setLocalStatsByHole((prev) => ({ ...prev, [hole]: nextHoleStats }));
              if (!options?.persistToServer) {
                return true;
              }
              if (options.backgroundPersist) {
                return true;
              }
              return true;
            }),
            saveClubActual: vi.fn(async () => null),
            deleteClubActualEntry: vi.fn(async () => {}),
            onToggleFocusMode: vi.fn(),
          }}
        />
      );
    }

    render(<StatefulPage />);

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));
    await user.click(within(screen.getByRole('group', { name: 'Virtual caddy putts selection' })).getByRole('button', { name: '2' }));
    const finalSaveButton = screen.getByRole('button', { name: 'Save result' });
    fireEvent.click(finalSaveButton);

    await waitFor(() => {
      const currentHoleButton = within(screen.getByLabelText('hole picker')).getByRole('button', { current: 'page' });
      expect(currentHoleButton.textContent).toContain('2');
    });
  });

  it('deletes stale club actuals when a completed hole is edited', async () => {
    const user = userEvent.setup();
    const saveClubActual = vi.fn()
      .mockResolvedValueOnce(101)
      .mockResolvedValueOnce(202)
      .mockResolvedValueOnce(301)
      .mockResolvedValueOnce(302);
    const deleteClubActualEntry = vi.fn(async () => {});

    render(
      <VirtualCaddyPage
        round={{
          selectedHole: 4,
          displayHoleIndex: 7,
          displayHolePar: 4,
          activeRound: { id: 'r1', name: 'Morning Round' },
          activeCourse: { id: 'c1', name: 'Royal Test', markers: {} as never },
          statsByHole,
          holeStats: {
            score: 0,
            holeIndex: 7,
            fairwaySelection: null,
            girSelection: null,
            teePosition: null,
            greenPosition: null,
          },
          saveState: 'saved',
          teeToGreenMeters: 420,
          clubCarryByClub: { Driver: 200, 'Mini Driver': 190, '3 wood': 180, '5i': 160, '6i': 150 },
          wedgeMatrices: [],
          wedgeEntriesByMatrix: {},
          isFocusMode: false,
        }}
        actions={{
          setSelectedHole: vi.fn(),
          saveCurrentRound: vi.fn(async () => true),
          replaceHoleStats: vi.fn(),
          saveHoleStats: vi.fn(async () => true),
          saveClubActual,
          deleteClubActualEntry,
          onToggleFocusMode: vi.fn(),
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));
    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '160' } });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));
    await user.click(within(screen.getByRole('group', { name: 'Virtual caddy putts selection' })).getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    expect(saveClubActual.mock.calls).toEqual([
      [{ club: 'Driver', actualMeters: 260 }],
      [{ club: '5i', actualMeters: 160 }],
    ]);

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[1]);
    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '150' } });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));
    await user.click(within(screen.getByRole('group', { name: 'Virtual caddy putts selection' })).getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    expect(deleteClubActualEntry.mock.calls).toEqual([[101], [202]]);
    expect(saveClubActual.mock.calls).toEqual([
      [{ club: 'Driver', actualMeters: 260 }],
      [{ club: '5i', actualMeters: 160 }],
      [{ club: 'Driver', actualMeters: 270 }],
      [{ club: '5i', actualMeters: 150 }],
    ]);
  });

  it('deletes stale club actuals after rehydrating a completed hole', async () => {
    const user = userEvent.setup();
    const saveClubActual = vi.fn()
      .mockResolvedValueOnce(101)
      .mockResolvedValueOnce(202)
      .mockResolvedValueOnce(301)
      .mockResolvedValueOnce(302);
    const deleteClubActualEntry = vi.fn(async () => {});
    const saveHoleStates: Array<(typeof statsByHole)[number]> = [];

    render(
      <VirtualCaddyPage
        round={{
          selectedHole: 4,
          displayHoleIndex: 4,
          displayHolePar: 4,
          activeRound: { id: 'r1', name: 'Morning Round' },
          activeCourse: { id: 'c1', name: 'Royal Test', markers: {} as never },
          statsByHole,
          holeStats: {
            score: 0,
            holeIndex: 4,
            fairwaySelection: null,
            girSelection: null,
            teePosition: null,
            greenPosition: null,
          },
          saveState: 'saved',
          teeToGreenMeters: 420,
          clubCarryByClub: { Driver: 200, 'Mini Driver': 190, '3 wood': 180, '5i': 160, '6i': 150 },
          wedgeMatrices: [],
          wedgeEntriesByMatrix: {},
          isFocusMode: false,
        }}
        actions={{
          setSelectedHole: vi.fn(),
          saveCurrentRound: vi.fn(async () => true),
          replaceHoleStats: vi.fn(),
          saveHoleStats: vi.fn(async (hole, nextHoleStats) => {
            saveHoleStates.push(nextHoleStats);
            return true;
          }),
          saveClubActual,
          deleteClubActualEntry,
          onToggleFocusMode: vi.fn(),
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));
    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '98' } });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));
    await user.click(within(screen.getByRole('group', { name: 'Virtual caddy putts selection' })).getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    expect(saveClubActual.mock.calls).toEqual([
      [{ club: 'Driver', actualMeters: 322 }],
      [{ club: 'PW', actualMeters: 98 }],
    ]);

    const savedHoleStats = saveHoleStates[saveHoleStates.length - 1];
    const rehydratedHoleStats = {
      ...savedHoleStats,
      virtualCaddyState: savedHoleStats.virtualCaddyState
        ? {
            ...savedHoleStats.virtualCaddyState,
            trail: Array.isArray(savedHoleStats.virtualCaddyState.trail)
              ? savedHoleStats.virtualCaddyState.trail.map((shot) => {
                  if (!shot || typeof shot !== 'object') {
                    return shot;
                  }
                  const { clubActualEntryId: _clubActualEntryId, ...rest } = shot as Record<string, unknown>;
                  return rest;
                })
              : savedHoleStats.virtualCaddyState.trail,
          }
        : null,
    };

    cleanup();

    render(
      <VirtualCaddyPage
        round={{
          selectedHole: 4,
          displayHoleIndex: 4,
          displayHolePar: 4,
          activeRound: { id: 'r1', name: 'Morning Round' },
          activeCourse: { id: 'c1', name: 'Royal Test', markers: {} as never },
          statsByHole: { ...buildInitialByHole(), 4: rehydratedHoleStats },
          holeStats: rehydratedHoleStats,
          saveState: 'saved',
          teeToGreenMeters: 420,
          clubCarryByClub: { Driver: 200, 'Mini Driver': 190, '3 wood': 180, '5i': 160, '6i': 150 },
          wedgeMatrices: [],
          wedgeEntriesByMatrix: {},
          isFocusMode: false,
        }}
        actions={{
          setSelectedHole: vi.fn(),
          saveCurrentRound: vi.fn(async () => true),
          replaceHoleStats: vi.fn(),
          saveHoleStats: vi.fn(async (hole, nextHoleStats) => {
            saveHoleStates.push(nextHoleStats);
            return true;
          }),
          saveClubActual,
          deleteClubActualEntry,
          onToggleFocusMode: vi.fn(),
        }}
      />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[1]);
    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '100' } });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));
    await user.click(within(screen.getByRole('group', { name: 'Virtual caddy putts selection' })).getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    expect(deleteClubActualEntry.mock.calls).toEqual([[101], [202]]);
    expect(saveClubActual.mock.calls).toEqual([
      [{ club: 'Driver', actualMeters: 322 }],
      [{ club: 'PW', actualMeters: 98 }],
      [{ club: 'Driver', actualMeters: 320 }],
      [{ club: 'PW', actualMeters: 100 }],
    ]);
  });

  it('syncs distance entries by round and hole when editing a completed hole without stored entry ids', async () => {
    const user = userEvent.setup();
    const syncVirtualCaddyClubActuals = vi.fn()
      .mockResolvedValueOnce([
        { shotId: 1, entryId: 101 },
        { shotId: 2, entryId: 202 },
      ])
      .mockResolvedValueOnce([
        { shotId: 1, entryId: 301 },
        { shotId: 2, entryId: 302 },
      ]);
    const saveHoleStates: Array<(typeof statsByHole)[number]> = [];

    render(
      <VirtualCaddyPage
        round={{
          selectedHole: 4,
          displayHoleIndex: 4,
          displayHolePar: 4,
          activeRound: { id: 'r1', name: 'Morning Round' },
          activeCourse: { id: 'c1', name: 'Royal Test', markers: {} as never },
          statsByHole,
          holeStats: {
            score: 0,
            holeIndex: 4,
            fairwaySelection: null,
            girSelection: null,
            teePosition: null,
            greenPosition: null,
          },
          saveState: 'saved',
          teeToGreenMeters: 420,
          clubCarryByClub: { Driver: 200, 'Mini Driver': 190, '3 wood': 180, '5i': 160, '6i': 150 },
          wedgeMatrices: [],
          wedgeEntriesByMatrix: {},
          isFocusMode: false,
        }}
        actions={{
          setSelectedHole: vi.fn(),
          saveCurrentRound: vi.fn(async () => true),
          replaceHoleStats: vi.fn(),
          saveHoleStats: vi.fn(async (hole, nextHoleStats) => {
            saveHoleStates.push(nextHoleStats);
            return true;
          }),
          saveClubActual: vi.fn(async () => null),
          syncVirtualCaddyClubActuals,
          deleteClubActualEntry: vi.fn(async () => {}),
          onToggleFocusMode: vi.fn(),
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));
    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '98' } });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));
    await user.click(within(screen.getByRole('group', { name: 'Virtual caddy putts selection' })).getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    expect(syncVirtualCaddyClubActuals).toHaveBeenNthCalledWith(1, {
      roundId: 'r1',
      hole: 4,
      shots: [
        { shotId: 1, club: 'Driver', actualMeters: 322 },
        { shotId: 2, club: 'PW', actualMeters: 98 },
      ],
    });

    const savedHoleStats = saveHoleStates[saveHoleStates.length - 1];
    const rehydratedHoleStats = {
      ...savedHoleStats,
      virtualCaddyState: savedHoleStats.virtualCaddyState
        ? {
            ...savedHoleStats.virtualCaddyState,
            clubActualEntryIds: [],
            trail: Array.isArray(savedHoleStats.virtualCaddyState.trail)
              ? savedHoleStats.virtualCaddyState.trail.map((shot) => {
                  if (!shot || typeof shot !== 'object') {
                    return shot;
                  }
                  const { clubActualEntryId: _clubActualEntryId, ...rest } = shot as Record<string, unknown>;
                  return rest;
                })
              : savedHoleStats.virtualCaddyState.trail,
          }
        : null,
    };

    cleanup();

    render(
      <VirtualCaddyPage
        round={{
          selectedHole: 4,
          displayHoleIndex: 4,
          displayHolePar: 4,
          activeRound: { id: 'r1', name: 'Morning Round' },
          activeCourse: { id: 'c1', name: 'Royal Test', markers: {} as never },
          statsByHole: { ...buildInitialByHole(), 4: rehydratedHoleStats },
          holeStats: rehydratedHoleStats,
          saveState: 'saved',
          teeToGreenMeters: 420,
          clubCarryByClub: { Driver: 200, 'Mini Driver': 190, '3 wood': 180, '5i': 160, '6i': 150 },
          wedgeMatrices: [],
          wedgeEntriesByMatrix: {},
          isFocusMode: false,
        }}
        actions={{
          setSelectedHole: vi.fn(),
          saveCurrentRound: vi.fn(async () => true),
          replaceHoleStats: vi.fn(),
          saveHoleStats: vi.fn(async (hole, nextHoleStats) => {
            saveHoleStates.push(nextHoleStats);
            return true;
          }),
          saveClubActual: vi.fn(async () => null),
          syncVirtualCaddyClubActuals,
          deleteClubActualEntry: vi.fn(async () => {}),
          onToggleFocusMode: vi.fn(),
        }}
      />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[1]);
    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '100' } });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));
    await user.click(within(screen.getByRole('group', { name: 'Virtual caddy putts selection' })).getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    expect(syncVirtualCaddyClubActuals).toHaveBeenNthCalledWith(2, {
      roundId: 'r1',
      hole: 4,
      shots: [
        { shotId: 1, club: 'Driver', actualMeters: 320 },
        { shotId: 2, club: 'PW', actualMeters: 100 },
      ],
    });
  });

  it('moves to the next hole after holing out', async () => {
    const user = userEvent.setup();
    const setSelectedHole = vi.fn();
    const saveHoleStats = vi.fn(async () => true);

    render(
      <VirtualCaddyPage
        round={{
          selectedHole: 4,
          displayHoleIndex: 7,
          displayHolePar: 3,
          activeRound: { id: 'r1', name: 'Morning Round' },
          activeCourse: { id: 'c1', name: 'Royal Test', markers: {} as never },
          statsByHole,
          holeStats: {
            score: 0,
            holeIndex: 7,
            fairwaySelection: null,
            girSelection: null,
            teePosition: null,
            greenPosition: null,
          },
          saveState: 'saved',
          teeToGreenMeters: 150,
          clubCarryByClub: { '6i': 150, '7i': 140, PW: 100 },
          wedgeMatrices: [],
          wedgeEntriesByMatrix: {},
          isFocusMode: false,
        }}
        actions={{
          setSelectedHole,
          saveCurrentRound: vi.fn(async () => true),
          replaceHoleStats: vi.fn(),
          saveHoleStats,
          saveClubActual: vi.fn(async () => 99),
          deleteClubActualEntry: vi.fn(async () => {}),
          onToggleFocusMode: vi.fn(),
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));
    await user.click(within(screen.getByRole('group', { name: 'Virtual caddy putts selection' })).getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    expect(saveHoleStats).toHaveBeenLastCalledWith(4, expect.any(Object), { persistToServer: true, backgroundPersist: true });
    expect(setSelectedHole).toHaveBeenCalledWith(5);
  });

  it('saves quick totals and advances to the next hole', async () => {
    const user = userEvent.setup();
    const setSelectedHole = vi.fn();
    const saveHoleStats = vi.fn(async () => true);

    render(
      <VirtualCaddyPage
        round={{
          selectedHole: 4,
          displayHoleIndex: 7,
          displayHolePar: 4,
          activeRound: { id: 'r1', name: 'Morning Round' },
          activeCourse: { id: 'c1', name: 'Royal Test', markers: {} as never },
          statsByHole,
          holeStats: {
            score: 0,
            holeIndex: 7,
            fairwaySelection: null,
            girSelection: null,
            teePosition: null,
            greenPosition: null,
          },
          saveState: 'saved',
          teeToGreenMeters: 390,
          clubCarryByClub: { Driver: 200, '3 wood': 180 },
          wedgeMatrices: [],
          wedgeEntriesByMatrix: {},
          isFocusMode: false,
        }}
        actions={{
          setSelectedHole,
          saveCurrentRound: vi.fn(async () => true),
          replaceHoleStats: vi.fn(),
          saveHoleStats,
          saveClubActual: vi.fn(async () => null),
          deleteClubActualEntry: vi.fn(async () => {}),
          onToggleFocusMode: vi.fn(),
        }}
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'Quick' }));
    await user.click(within(screen.getByRole('group', { name: 'Quick score presets' })).getByRole('button', { name: '5 Bogey' }));
    await user.click(within(screen.getByRole('group', { name: 'Quick fairway selection' })).getByRole('button', { name: 'Left' }));
    await user.click(within(screen.getByRole('group', { name: 'Quick GIR selection' })).getByRole('button', { name: 'No chance' }));
    await user.click(within(screen.getByRole('group', { name: 'Quick putts selection' })).getByRole('button', { name: '3' }));
    await user.click(within(screen.getByRole('group', { name: 'Quick penalties selection' })).getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Save and next' }));

    expect(saveHoleStats).toHaveBeenLastCalledWith(
      4,
      expect.objectContaining({
        score: 5,
        fairwaySelection: 'fairwayLeft',
        girSelection: 'girNoChance',
        totalPutts: 3,
        penalties: 2,
        virtualCaddyState: null,
      }),
      { persistToServer: true, backgroundPersist: true },
    );
    expect(setSelectedHole).toHaveBeenCalledWith(5);
  });

  it('shows the quick summary when returning to a quick-saved hole', async () => {
    const user = userEvent.setup();
    const saveHoleStates: Array<(typeof statsByHole)[number]> = [];

    render(
      <VirtualCaddyPage
        round={{
          selectedHole: 4,
          displayHoleIndex: 7,
          displayHolePar: 4,
          activeRound: { id: 'r1', name: 'Morning Round' },
          activeCourse: { id: 'c1', name: 'Royal Test', markers: {} as never },
          statsByHole,
          holeStats: {
            score: 0,
            holeIndex: 7,
            fairwaySelection: null,
            girSelection: null,
            teePosition: null,
            greenPosition: null,
          },
          saveState: 'saved',
          teeToGreenMeters: 390,
          clubCarryByClub: { Driver: 200, '3 wood': 180 },
          wedgeMatrices: [],
          wedgeEntriesByMatrix: {},
          isFocusMode: false,
        }}
        actions={{
          setSelectedHole: vi.fn(),
          saveCurrentRound: vi.fn(async () => true),
          replaceHoleStats: vi.fn(),
          saveHoleStats: vi.fn(async (hole, nextHoleStats) => {
            saveHoleStates.push(nextHoleStats);
            return true;
          }),
          saveClubActual: vi.fn(async () => null),
          deleteClubActualEntry: vi.fn(async () => {}),
          onToggleFocusMode: vi.fn(),
        }}
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'Quick' }));
    await user.click(within(screen.getByRole('group', { name: 'Quick score presets' })).getByRole('button', { name: '5 Bogey' }));
    await user.click(within(screen.getByRole('group', { name: 'Quick putts selection' })).getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Save and next' }));

    const savedHoleStats = saveHoleStates[saveHoleStates.length - 1];

    cleanup();

    function QuickSavedHoleHarness() {
      const [holeState, setHoleState] = useState(savedHoleStats);
      const [allStats, setAllStats] = useState({ ...buildInitialByHole(), 4: savedHoleStats });

      return (
        <VirtualCaddyPage
          round={{
            selectedHole: 4,
            displayHoleIndex: 7,
            displayHolePar: 4,
            activeRound: { id: 'r1', name: 'Morning Round' },
            activeCourse: { id: 'c1', name: 'Royal Test', markers: {} as never },
            statsByHole: allStats,
            holeStats: holeState,
            saveState: 'saved',
            teeToGreenMeters: 390,
            clubCarryByClub: { Driver: 200, '3 wood': 180 },
            wedgeMatrices: [],
            wedgeEntriesByMatrix: {},
            isFocusMode: false,
          }}
          actions={{
            setSelectedHole: vi.fn(),
            saveCurrentRound: vi.fn(async () => true),
            replaceHoleStats: vi.fn((nextHoleStats) => {
              setHoleState(nextHoleStats);
              setAllStats((prev) => ({ ...prev, 4: nextHoleStats }));
            }),
            saveHoleStats: vi.fn(async () => true),
            saveClubActual: vi.fn(async () => null),
            deleteClubActualEntry: vi.fn(async () => {}),
            onToggleFocusMode: vi.fn(),
          }}
        />
      );
    }

    render(<QuickSavedHoleHarness />);

    const summaryCard = screen.getByText('Hole summary').closest('.virtual-caddy-complete');
    expect(summaryCard).toBeTruthy();
    expect(within(summaryCard as HTMLElement).getByText('Score')).toBeTruthy();
    expect(within(summaryCard as HTMLElement).getByText('Putts')).toBeTruthy();
    expect(within(summaryCard as HTMLElement).getByText('5')).toBeTruthy();
    expect(within(summaryCard as HTMLElement).getByText('2')).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Quick' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save and next' })).toBeNull();
  });

  it('lets you edit a quick-saved hole from the summary and returns to the summary after saving', async () => {
    const user = userEvent.setup();
    const initialHoleStats = {
      ...buildInitialByHole()[4],
      holeIndex: 7,
      score: 5,
      totalPutts: 2,
      fairwaySelection: 'fairwayLeft',
      quickEntrySaved: true,
    };

    function QuickSavedEditHarness() {
      const [holeState, setHoleState] = useState(initialHoleStats);
      const [allStats, setAllStats] = useState({ ...buildInitialByHole(), 4: initialHoleStats });

      return (
        <VirtualCaddyPage
          round={{
            selectedHole: 4,
            displayHoleIndex: 7,
            displayHolePar: 4,
            activeRound: { id: 'r1', name: 'Morning Round' },
            activeCourse: { id: 'c1', name: 'Royal Test', markers: {} as never },
            statsByHole: allStats,
            holeStats: holeState,
            saveState: 'saved',
            teeToGreenMeters: 390,
            clubCarryByClub: { Driver: 200, '3 wood': 180 },
            wedgeMatrices: [],
            wedgeEntriesByMatrix: {},
            isFocusMode: false,
          }}
          actions={{
            setSelectedHole: vi.fn(),
            saveCurrentRound: vi.fn(async () => true),
            replaceHoleStats: vi.fn((nextHoleStats) => {
              setHoleState(nextHoleStats);
              setAllStats((prev) => ({ ...prev, 4: nextHoleStats }));
            }),
            saveHoleStats: vi.fn(async (_hole, nextHoleStats) => {
              setHoleState(nextHoleStats);
              setAllStats((prev) => ({ ...prev, 4: nextHoleStats }));
              return true;
            }),
            saveClubActual: vi.fn(async () => null),
            deleteClubActualEntry: vi.fn(async () => {}),
            onToggleFocusMode: vi.fn(),
          }}
        />
      );
    }

    render(<QuickSavedEditHarness />);

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('tab', { name: 'Quick' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
    await user.click(within(screen.getByRole('group', { name: 'Quick putts selection' })).getByRole('button', { name: '3' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const summaryCard = screen.getByText('Hole summary').closest('.virtual-caddy-complete');
    expect(summaryCard).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
    expect(within(summaryCard as HTMLElement).getByText('3')).toBeTruthy();
  });

  it('waits for next on a direct holed finish before moving to the next hole', async () => {
    const user = userEvent.setup();
    const setSelectedHole = vi.fn();
    const saveHoleStats = vi.fn(async () => true);

    render(
      <VirtualCaddyPage
        round={{
          selectedHole: 4,
          displayHoleIndex: 7,
          displayHolePar: 3,
          activeRound: { id: 'r1', name: 'Morning Round' },
          activeCourse: { id: 'c1', name: 'Royal Test', markers: {} as never },
          statsByHole,
          holeStats: {
            score: 0,
            holeIndex: 7,
            fairwaySelection: null,
            girSelection: null,
            teePosition: null,
            greenPosition: null,
          },
          saveState: 'saved',
          teeToGreenMeters: 150,
          clubCarryByClub: { '6i': 150, '7i': 140, PW: 100 },
          wedgeMatrices: [],
          wedgeEntriesByMatrix: {},
          isFocusMode: false,
        }}
        actions={{
          setSelectedHole,
          saveCurrentRound: vi.fn(async () => true),
          replaceHoleStats: vi.fn(),
          saveHoleStats,
          saveClubActual: vi.fn(async () => 99),
          deleteClubActualEntry: vi.fn(async () => {}),
          onToggleFocusMode: vi.fn(),
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Holed' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    expect(screen.getByText('Hole in one')).toBeTruthy();
    expect(saveHoleStats).toHaveBeenLastCalledWith(4, expect.any(Object), { persistToServer: true, backgroundPersist: false });
    expect(setSelectedHole).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(saveHoleStats).toHaveBeenCalledTimes(2);
    expect(setSelectedHole).toHaveBeenCalledWith(5);
  });
});
