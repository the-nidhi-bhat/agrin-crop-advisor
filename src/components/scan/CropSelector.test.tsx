import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CROPS } from '../../lib/crops';
import { CropSelector } from './CropSelector';

describe('CropSelector', () => {
  it('exposes every supported crop with unique ids and names', () => {
    expect(CROPS.length).toBeGreaterThanOrEqual(10);
    const ids = new Set(CROPS.map((c) => c.id));
    const names = new Set(CROPS.map((c) => c.name));
    expect(ids.size).toBe(CROPS.length);
    expect(names.size).toBe(CROPS.length);
    expect(CROPS[0].name).toBe('Tomato');
  });

  it('renders one radio per crop and reflects the selected value', () => {
    const onChange = vi.fn();
    render(<CropSelector value="Soybean" onChange={onChange} />);

    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBe(CROPS.length);
    CROPS.forEach((crop) =>
      expect(screen.getByRole('radio', { name: new RegExp(crop.name) })).toBeInTheDocument(),
    );

    const selected = screen.getByRole('radio', { name: /Soybean/i });
    expect(selected).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Tomato/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('selects a crop on click', () => {
    const onChange = vi.fn();
    render(<CropSelector value="Tomato" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: /Sugarcane/i }));
    expect(onChange).toHaveBeenCalledWith('Sugarcane');
  });

  it('moves focus with arrow keys, Home/End, and wraps around the list', () => {
    const onChange = vi.fn();
    render(<CropSelector value="Tomato" onChange={onChange} />);
    const radios = screen.getAllByRole('radio');
    const first = radios[0];
    first.focus();

    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(radios[1]).toHaveFocus();

    fireEvent.keyDown(radios[1], { key: 'ArrowDown' });
    expect(radios[2]).toHaveFocus();

    fireEvent.keyDown(radios[2], { key: 'End' });
    expect(radios[CROPS.length - 1]).toHaveFocus();

    fireEvent.keyDown(radios[CROPS.length - 1], { key: 'ArrowRight' });
    expect(radios[0]).toHaveFocus();

    fireEvent.keyDown(radios[0], { key: 'Home' });
    expect(radios[0]).toHaveFocus();
  });
});