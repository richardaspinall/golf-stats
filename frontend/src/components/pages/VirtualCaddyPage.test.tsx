/** @vitest-environment jsdom */

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VirtualCaddyPage } from './VirtualCaddyPage';

afterEach(() => {
  cleanup();
});

describe('VirtualCaddyPage', () => {
  it('hides extra page chrome in focus mode', async () => {
    render(
      <VirtualCaddyPage
        round={{
          selectedHole: 4,
          displayHoleIndex: 7,
          displayHolePar: 4,
          activeRound: { id: 'r1', name: 'Morning Round' },
          activeCourse: { id: 'c1', name: 'Royal Test', markers: {} as never },
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
    expect(within(caddyRegion).getByRole('heading', { name: 'Hole status' })).toBeTruthy();
    expect(within(caddyRegion).getByText('Index')).toBeTruthy();
    expect(within(caddyRegion).getByText('7')).toBeTruthy();
    expect(within(caddyRegion).getByText('152m')).toBeTruthy();
    expect(within(caddyRegion).getAllByText('4').length).toBeGreaterThan(0);
    expect(screen.queryByText(/focus mode/i)).toBeNull();
  });

  it('persists the round when saving a caddy shot', async () => {
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
    expect(saveClubActual).toHaveBeenCalledTimes(1);
  });

  it('moves to the next hole after holing out', async () => {
    const user = userEvent.setup();
    const setSelectedHole = vi.fn();

    render(
      <VirtualCaddyPage
        round={{
          selectedHole: 4,
          displayHoleIndex: 7,
          displayHolePar: 3,
          activeRound: { id: 'r1', name: 'Morning Round' },
          activeCourse: { id: 'c1', name: 'Royal Test', markers: {} as never },
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
          saveHoleStats: vi.fn(async () => true),
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
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(within(screen.getByRole('group', { name: 'Virtual caddy putts selection' })).getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    expect(setSelectedHole).toHaveBeenCalledWith(5);
  });
});
