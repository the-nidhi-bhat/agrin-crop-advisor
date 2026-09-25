import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JourneyStepper } from './JourneyStepper';
import { EvidenceSection } from './EvidenceSection';
import { ActionPlan } from './ActionPlan';

describe('JourneyStepper', () => {
  it('renders the four journey steps in order', () => {
    render(<JourneyStepper completed={4} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(screen.getByText('Scan')).toBeInTheDocument();
    expect(screen.getByText('Understand')).toBeInTheDocument();
    expect(screen.getByText('Act')).toBeInTheDocument();
    expect(screen.getByText('Monitor')).toBeInTheDocument();
    expect(items[0].querySelector('span')?.textContent).toContain('✓');
  });

  it('does not mark steps done when nothing is completed', () => {
    render(<JourneyStepper compact />);
    const items = screen.getAllByRole('listitem');
    for (const item of items) {
      expect(item.querySelector('span')?.textContent).not.toContain('✓');
    }
  });
});

describe('EvidenceSection', () => {
  beforeEach(() => localStorage.setItem('agrin_presentation', 'detailed'));
  afterEach(() => localStorage.removeItem('agrin_presentation'));

  it('renders the why-title, symptoms bullets, crop context, and help line', () => {
    render(
      <EvidenceSection
        symptoms={'Brown spots on the lower leaves. The edges are curling.'}
        crop="Tomato"
      />,
    );
    expect(screen.getByRole('heading', { name: /Why this result?/ })).toBeInTheDocument();
    const list = document.querySelector('ul.list-disc');
    expect(list?.querySelectorAll('li')).toHaveLength(2);
    expect(screen.getByText(/Crop context/)).toBeInTheDocument();
    expect(screen.getAllByText(/Tomato/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/ask a local agricultural extension officer/)).toBeInTheDocument();
  });

  it('renders a single symptom as prose without a list', () => {
    render(<EvidenceSection symptoms={'The leaf is yellowing.'} crop="Tomato" />);
    expect(document.querySelector('ul.list-disc')).toBeNull();
    expect(screen.getByText('The leaf is yellowing.')).toBeInTheDocument();
  });

  it('omits the symptoms list when none are provided', () => {
    render(<EvidenceSection symptoms={undefined} crop="Tomato" />);
    expect(document.querySelector('ul.list-disc')).toBeNull();
    expect(screen.getByRole('heading', { name: /Why this result?/ })).toBeInTheDocument();
  });

  it('renders the simple presentation variant', () => {
    localStorage.setItem('agrin_presentation', 'simple');
    render(
      <EvidenceSection simple symptoms={'Brown spots on the lower leaves. The edges are curling.'} crop="Tomato" />,
    );
    expect(screen.getByText('What you may notice')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Why this result?/ })).toBeNull();
    expect(document.querySelector('ul.list-disc')?.querySelectorAll('li')).toHaveLength(2);
  });
});

describe('ActionPlan', () => {
  it('renders the prioritized plan with a leading first action', () => {
    render(<ActionPlan advisory="Remove and dispose of infected leaves. Keep the base dry." />);
    expect(screen.getByText('Do now')).toBeInTheDocument();
    expect(screen.getByText(/Keep watching/)).toBeInTheDocument();
    expect(screen.getByText(/Get local help/)).toBeInTheDocument();
    const firstAction = screen.getAllByText(/Remove and dispose of infected leaves/)[0];
    expect(firstAction).toBeInTheDocument();
  });
});