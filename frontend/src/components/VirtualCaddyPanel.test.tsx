/** @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VirtualCaddyPanel } from './VirtualCaddyPanel';

afterEach(() => {
  cleanup();
});

describe('VirtualCaddyPanel', () => {
  it('shows a fast recommendation from distance-only input', async () => {
    render(<VirtualCaddyPanel defaultDistanceMeters={150} onUseRecommendation={vi.fn()} />);

    expect(screen.getByText('6i')).toBeTruthy();
    expect(screen.getByText('150m effective')).toBeTruthy();
    expect(screen.getByText('Use in tracker')).toBeTruthy();
  });

  it('updates the recommendation when advanced context changes', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel defaultDistanceMeters={150} onUseRecommendation={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Add detail' }));
    await user.click(screen.getByRole('button', { name: 'Rough' }));
    await user.click(screen.getByRole('button', { name: 'Uphill' }));
    await user.click(screen.getByRole('button', { name: 'Trouble left' }));

    expect(screen.getByText('4i')).toBeTruthy();
    expect(screen.getByText('164m effective')).toBeTruthy();
    expect(screen.getByText('Left-side trouble: bias the target slightly right of center.')).toBeTruthy();
  });

  it('passes the recommendation into the tracker callback', async () => {
    const user = userEvent.setup();
    const onUseRecommendation = vi.fn();

    render(<VirtualCaddyPanel defaultDistanceMeters={150} onUseRecommendation={onUseRecommendation} />);

    await user.click(screen.getByRole('button', { name: 'Use in tracker' }));

    expect(onUseRecommendation).toHaveBeenCalledWith({
      club: '6i',
      targetDistanceMeters: 150,
      lie: 'Fairway',
    });
  });
});
