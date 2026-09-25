import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageSelector } from './LanguageSelector';

function renderSelector(initial = 'en') {
  const onChange = vi.fn();
  const utils = render(<LanguageSelector value={initial} onChange={onChange} />);
  return { onChange, ...utils };
}

describe('LanguageSelector', () => {
  it('renders a radio for every declared language with a native name label', () => {
    renderSelector();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(9);
    expect(screen.getByRole('radio', { name: /ಕನ್ನಡ/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /हिन्दी/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /తెలుగు/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /ગુજરાતી/ })).toBeInTheDocument();
  });

  it('marks the current value as checked and others unchecked', () => {
    renderSelector('kn');
    const radios = screen.getAllByRole('radio');
    expect(radios[1]).toHaveAttribute('aria-checked', 'true'); // ಕನ್ನಡ
    expect(radios[0]).toHaveAttribute('aria-checked', 'false'); // English
    expect(radios[2]).toHaveAttribute('aria-checked', 'false'); // हिन्दी
  });

  it('labels every coming-soon language and disables it', () => {
    const { container } = renderSelector();
    const comingSoon = screen.getAllByText('Coming soon');
    expect(comingSoon.length).toBe(7);
    const hindi = screen.getByRole('radio', { name: /हिन्दी/ });
    expect(hindi).toBeDisabled();
    expect(hindi).toHaveAttribute('aria-disabled', 'true');
    expect(container.querySelector('[role="radiogroup"]')).toHaveAttribute('aria-label', 'Language');
  });

  it('selecting an available language fires onChange, selecting a coming-soon one does not', () => {
    const { onChange } = renderSelector();
    fireEvent.click(screen.getByRole('radio', { name: /ಕನ್ನಡ/ }));
    expect(onChange).toHaveBeenCalledWith('kn');
    onChange.mockClear();
    fireEvent.click(screen.getByRole('radio', { name: /हिन्दी/ }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('navigates available languages with arrow keys and skips coming-soon ones', () => {
    const { container } = renderSelector('en');
    const radios = screen.getAllByRole('radio');
    fireEvent.keyDown(radios[0], { key: 'ArrowRight' });
    expect(container.ownerDocument.activeElement?.textContent).toContain('ಕನ್ನಡ');
    fireEvent.keyDown(radios[1], { key: 'ArrowDown' });
    expect(container.ownerDocument.activeElement?.textContent).toContain('English');
    fireEvent.keyDown(radios[0], { key: 'End' });
    expect(container.ownerDocument.activeElement?.textContent).toContain('ಕನ್ನಡ');
    fireEvent.keyDown(radios[1], { key: 'Home' });
    expect(container.ownerDocument.activeElement?.textContent).toContain('English');
  });
});