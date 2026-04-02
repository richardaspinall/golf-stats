/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VirtualCaddyPanel } from './VirtualCaddyPanel';
import { emptyHoleStats } from '../lib/rounds';

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

    expect(onSaveClubActual).toHaveBeenCalledWith({ club: '6i', actualMeters: 150 });
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

    await advanceToAction(user);

    expect(screen.getByText('(83m carry)')).toBeTruthy();
    expect(screen.getByText('Swing: 9:00')).toBeTruthy();
    expect(screen.getByText('Stock wedges')).toBeTruthy();
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
