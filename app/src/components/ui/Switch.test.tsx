import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './Switch';

describe('Switch', () => {
  it('exposes a switch role with checked state', () => {
    render(<Switch checked aria-label="Beyond Circle" onCheckedChange={() => {}} />);
    expect(screen.getByRole('switch', { name: 'Beyond Circle' })).toBeChecked();
  });

  it('toggles via keyboard', async () => {
    const onChange = vi.fn();
    render(<Switch aria-label="Emergency" onCheckedChange={onChange} />);
    const sw = screen.getByRole('switch', { name: 'Emergency' });
    sw.focus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
