/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VirtualCaddyPanel } from './VirtualCaddyPanel';
import { emptyHoleStats } from '../lib/rounds';
import type { HoleStats } from '../types';

afterEach(() => {
  cleanup();
});

const advanceToSetup = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Next' }));
};

const advanceToAction = async (user: ReturnType<typeof userEvent.setup>) => {
  await advanceToSetup(user);
  await user.click(screen.getByRole('button', { name: 'Next' }));
};

describe('VirtualCaddyPanel', () => {
  it('shows the hole overview and advances into the tee-shot flow', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={1} holeStats={emptyHoleStats()} displayHolePar={4} defaultDistanceMeters={150} onReplaceHoleStats={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Hole details' })).toBeTruthy();
    expect(screen.getByText('Length')).toBeTruthy();

    await advanceToSetup(user);

    expect(screen.getByRole('heading', { name: 'Tee shot' })).toBeTruthy();
    expect(screen.getByLabelText('Virtual caddy distance to hole')).toBeTruthy();
  });

  it('updates the recommendation when advanced context changes', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={1} holeStats={emptyHoleStats()} displayHolePar={4} defaultDistanceMeters={150} onReplaceHoleStats={vi.fn()} />);

    await advanceToSetup(user);
    await user.click(screen.getByRole('button', { name: 'Add detail' }));
    await user.click(screen.getByRole('button', { name: 'Rough' }));
    await user.click(screen.getByRole('button', { name: 'Uphill' }));
    await user.click(screen.getByRole('button', { name: 'Trouble left' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('(170m carry)')).toBeTruthy();
    expect(screen.getByText('Effective distance')).toBeTruthy();
    expect(screen.getByText('Recommendation adjusted for current conditions.')).toBeTruthy();
  });

  it('supports overriding the recommended club and resetting to recommended', async () => {
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

    await advanceToAction(user);
    await user.click(screen.getByRole('button', { name: 'Override club' }));
    await user.click(screen.getByRole('button', { name: 'Show all clubs' }));
    await user.click(screen.getByRole('button', { name: '7i' }));

    expect(screen.getByText('Recommended: 6i')).toBeTruthy();
    expect(screen.getByText('(140m carry)')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Reset to recommended' }));

    expect(screen.queryByText('Recommended: 6i')).toBeNull();
    expect(screen.getByText('(150m carry)')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    expect(onSaveClubActual).not.toHaveBeenCalled();
  });

  it('shows bunker lie options and uses them in the recommendation', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={1} holeStats={emptyHoleStats()} displayHolePar={4} defaultDistanceMeters={80} onReplaceHoleStats={vi.fn()} />);

    await advanceToSetup(user);
    await user.click(screen.getByRole('button', { name: 'Add detail' }));
    await user.click(screen.getByRole('button', { name: 'Bunker' }));
    await user.click(screen.getByRole('button', { name: 'Buried' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('(110m carry)')).toBeTruthy();
    expect(screen.getByText('Effective distance')).toBeTruthy();
  });

  it('uses wedge matrix recommendations inside 100m', async () => {
    const user = userEvent.setup();
    const onOpenWedgeMatrix = vi.fn();

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
        onOpenWedgeMatrix={onOpenWedgeMatrix}
      />,
    );

    await advanceToAction(user);

    expect(screen.getByText('(83m carry)')).toBeTruthy();
    expect(screen.getByText('Swing: 9:00')).toBeTruthy();
    expect(screen.getByText('Stock wedges')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Open matrix' }));

    expect(onOpenWedgeMatrix).toHaveBeenCalledWith(1);
  });

  it('adds the saved shot to the trail and seeds the next shot setup', async () => {
    const user = userEvent.setup();
    const onReplaceHoleStats = vi.fn();

    render(<VirtualCaddyPanel hole={4} holeStats={emptyHoleStats()} displayHolePar={4} defaultDistanceMeters={420} onReplaceHoleStats={onReplaceHoleStats} />);

    await advanceToAction(user);
    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    expect(screen.getByRole('heading', { name: 'Shot 2' })).toBeTruthy();
    expect(screen.getByText('Driver · 230m')).toBeTruthy();
    expect(onReplaceHoleStats).toHaveBeenCalled();
  });

  it('saves the reconciled club distances only when the hole is complete', async () => {
    const user = userEvent.setup();
    const onSaveClubActual = vi.fn()
      .mockResolvedValueOnce(101)
      .mockResolvedValueOnce(202)
      .mockResolvedValueOnce(303);

    render(
      <VirtualCaddyPanel
        hole={4}
        holeStats={emptyHoleStats()}
        displayHolePar={4}
        defaultDistanceMeters={420}
        onReplaceHoleStats={vi.fn()}
        onSaveClubActual={onSaveClubActual}
      />,
    );

    await advanceToAction(user);
    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));
    expect(onSaveClubActual).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '160' } });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));
    expect(onSaveClubActual).not.toHaveBeenCalled();

    await user.click(within(screen.getByRole('group', { name: 'Virtual caddy putts selection' })).getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    expect(onSaveClubActual.mock.calls).toEqual([
      [{ club: 'Driver', actualMeters: 260 }],
      [{ club: '5i', actualMeters: 160 }],
    ]);
  });

  it('enters the putting flow after a green hit and tracks putts', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={4} holeStats={emptyHoleStats()} displayHolePar={4} defaultDistanceMeters={150} onReplaceHoleStats={vi.fn()} />);

    await advanceToAction(user);
    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));
    await user.click(within(screen.getByRole('group', { name: 'Virtual caddy putts selection' })).getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    expect(screen.getByText('Putter: 2 putts')).toBeTruthy();
  });

  it('adjusts the previous shot distance from the putting step before hole completion', async () => {
    const user = userEvent.setup();
    const onSaveClubActual = vi.fn()
      .mockResolvedValueOnce(101)
      .mockResolvedValueOnce(202);

    render(
      <VirtualCaddyPanel
        hole={4}
        holeStats={emptyHoleStats()}
        displayHolePar={4}
        defaultDistanceMeters={420}
        onReplaceHoleStats={vi.fn()}
        onSaveClubActual={onSaveClubActual}
      />,
    );

    await advanceToAction(user);
    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '160' } });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    const previousShotCard = screen.getByText('Previous shot vs flag').closest('.prototype-block');
    expect(previousShotCard).toBeTruthy();
    await user.click(within(previousShotCard as HTMLElement).getByRole('button', { name: 'Adjust' }));
    expect(screen.getByLabelText('Virtual caddy previous shot distance adjustment')).toBeTruthy();
    await user.click(within(previousShotCard as HTMLElement).getByRole('button', { name: '+5m' }));
    expect(screen.getByText('Recorded previous shot')).toBeTruthy();
    expect(screen.getByText('165m')).toBeTruthy();
    expect(screen.getByText('5i · 165m')).toBeTruthy();

    await user.click(within(screen.getByRole('group', { name: 'Virtual caddy putts selection' })).getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    expect(onSaveClubActual.mock.calls).toEqual([
      [{ club: 'Driver', actualMeters: 260 }],
      [{ club: '5i', actualMeters: 165 }],
    ]);
  });

  it('rehydrates a completed hole without replacing zero distances with the full hole length', async () => {
    const user = userEvent.setup();
    const savedHoleStates: HoleStats[] = [];

    render(
      <VirtualCaddyPanel
        hole={4}
        holeStats={emptyHoleStats()}
        displayHolePar={4}
        defaultDistanceMeters={260}
        onReplaceHoleStats={vi.fn()}
        onSaveHoleStats={async (nextHoleStats) => {
          savedHoleStates.push(nextHoleStats);
          return true;
        }}
        onHoleComplete={() => true}
      />,
    );

    await advanceToAction(user);
    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '86' } });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    await user.click(within(screen.getByRole('group', { name: 'Virtual caddy putts selection' })).getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    const finalSavedHoleStats = savedHoleStates[savedHoleStates.length - 1];
    expect(finalSavedHoleStats.virtualCaddyState?.trail).toHaveLength(3);

    cleanup();

    render(
      <VirtualCaddyPanel
        hole={4}
        holeStats={finalSavedHoleStats}
        displayHolePar={4}
        defaultDistanceMeters={260}
        onReplaceHoleStats={vi.fn()}
      />,
    );

    expect(screen.getByText('Putter: 2 putts')).toBeTruthy();
    expect(screen.queryByText('50w · 0m')).toBeNull();
    expect(screen.queryByText('260m')).toBeNull();
  });

  it('deletes the previous affected club distances when editing a completed hole', async () => {
    const user = userEvent.setup();
    const onSaveClubActual = vi.fn()
      .mockResolvedValueOnce(101)
      .mockResolvedValueOnce(202)
      .mockResolvedValueOnce(301)
      .mockResolvedValueOnce(302);
    const onDeleteClubActualEntry = vi.fn().mockResolvedValue(undefined);

    render(
      <VirtualCaddyPanel
        hole={4}
        holeStats={emptyHoleStats()}
        displayHolePar={4}
        defaultDistanceMeters={420}
        onReplaceHoleStats={vi.fn()}
        onSaveClubActual={onSaveClubActual}
        onDeleteClubActualEntry={onDeleteClubActualEntry}
      />,
    );

    await advanceToAction(user);
    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));
    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '160' } });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Green hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));
    await user.click(within(screen.getByRole('group', { name: 'Virtual caddy putts selection' })).getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    expect(onSaveClubActual.mock.calls).toEqual([
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

    expect(onDeleteClubActualEntry.mock.calls).toEqual([[101], [202]]);
    expect(onSaveClubActual.mock.calls).toEqual([
      [{ club: 'Driver', actualMeters: 260 }],
      [{ club: '5i', actualMeters: 160 }],
      [{ club: 'Driver', actualMeters: 270 }],
      [{ club: '5i', actualMeters: 150 }],
    ]);
  });

  it('allows editing a saved shot and cancelling back to the previous snapshot', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={4} holeStats={emptyHoleStats()} displayHolePar={4} defaultDistanceMeters={420} onReplaceHoleStats={vi.fn()} />);

    await advanceToAction(user);
    await user.click(screen.getByRole('button', { name: 'Fairway hit' }));
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('heading', { name: 'Tee shot' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Virtual caddy distance to hole'), { target: { value: '180' } });
    await user.click(screen.getByRole('button', { name: 'Cancel edit' }));

    expect(screen.getByText('Driver · 230m')).toBeTruthy();
  });
});
