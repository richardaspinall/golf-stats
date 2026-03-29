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
    render(<VirtualCaddyPanel hole={1} defaultDistanceMeters={150} onExecuteShot={vi.fn()} />);

    expect(screen.getByText('6i')).toBeTruthy();
    expect(screen.getByText('150m effective')).toBeTruthy();
    expect(screen.getByText('6i for 150m effective. Aim center green.')).toBeTruthy();
  });

  it('updates the recommendation when advanced context changes', async () => {
    const user = userEvent.setup();

    render(<VirtualCaddyPanel hole={1} defaultDistanceMeters={150} onExecuteShot={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Add detail' }));
    await user.click(screen.getByRole('button', { name: 'Rough' }));
    await user.click(screen.getByRole('button', { name: 'Uphill' }));
    await user.click(screen.getByRole('button', { name: 'Trouble left' }));

    expect(screen.getByText('4i')).toBeTruthy();
    expect(screen.getByText('164m effective')).toBeTruthy();
    expect(screen.getByText('Left-side trouble: bias the target slightly right of center.')).toBeTruthy();
  });

  it('passes the execution outcome into the callback', async () => {
    const user = userEvent.setup();
    const onExecuteShot = vi.fn();

    render(<VirtualCaddyPanel hole={4} defaultDistanceMeters={150} onExecuteShot={onExecuteShot} />);

    await user.click(screen.getByRole('button', { name: 'Execute' }));
    await user.click(screen.getByRole('button', { name: 'No look' }));
    await user.click(screen.getByRole('button', { name: 'Chip shot' }));
    await user.click(screen.getByRole('button', { name: 'Over 3 inside 100' }));
    await user.click(screen.getByRole('button', { name: 'Save execution' }));

    expect(onExecuteShot).toHaveBeenCalledWith({
      hole: 4,
      scoreDelta: 1,
      oopResult: 'noLook',
      shotCategory: 'chip',
      inside100Over3: true,
    });
  });
});
