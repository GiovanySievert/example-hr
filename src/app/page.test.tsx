import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from './page';

describe('Home', () => {
  it('renders the app title and navigation', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: 'ExampleHR' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /employee · time off/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /manager · approvals/i })).toBeInTheDocument();
  });
});
