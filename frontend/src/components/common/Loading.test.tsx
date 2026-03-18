import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Loading } from './Loading';

describe('Loading', () => {
  it('should render loading message', () => {
    render(<Loading fullScreen={false} message="Carregando..." />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('should render with default message', () => {
    render(<Loading fullScreen={false} />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('should render full screen by default', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.min-h-screen')).toBeInTheDocument();
  });

  it('should not render full screen when fullScreen is false', () => {
    const { container } = render(<Loading fullScreen={false} />);
    expect(container.querySelector('.min-h-screen')).not.toBeInTheDocument();
  });
});
