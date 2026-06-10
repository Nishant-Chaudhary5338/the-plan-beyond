import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('derives two initials from a full name', () => {
    render(<Avatar name="Amit Bansal" />);
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('falls back to a single initial for one-word names', () => {
    render(<Avatar name="Amit" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders a stable tint for the same name', () => {
    const { container, rerender } = render(<Avatar name="Priya Shah" />);
    const first = container.firstElementChild?.className;
    rerender(<Avatar name="Priya Shah" />);
    expect(container.firstElementChild?.className).toBe(first);
  });
});
