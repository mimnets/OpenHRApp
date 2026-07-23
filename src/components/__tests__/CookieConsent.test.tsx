import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CookieConsent from '../CookieConsent';

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the consent banner when no preference is stored', () => {
    render(<CookieConsent />);
    expect(screen.getByText(/We use cookies and analytics/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Decline/i })).toBeInTheDocument();
  });

  it('does not render when consent was previously accepted', () => {
    localStorage.setItem('openhr-cookie-consent', 'accepted');
    const { container } = render(<CookieConsent />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when consent was previously declined', () => {
    localStorage.setItem('openhr-cookie-consent', 'declined');
    const { container } = render(<CookieConsent />);
    expect(container.firstChild).toBeNull();
  });
});
