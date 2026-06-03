import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from './page';

describe('Home', () => {
  it('renderiza o heading inicial', () => {
    render(<Home />);
    expect(
      screen.getByRole('heading', { name: /edit the page\.tsx/i }),
    ).toBeInTheDocument();
  });
});
