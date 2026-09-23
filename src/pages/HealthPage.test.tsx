import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { HealthPage } from './HealthPage';

const { mockSelect, mockSignedUrl } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockSignedUrl: vi.fn(),
}));

function mockDiagnosesQuery(data: unknown[] | null, error: { message: string } | null) {
  const order = vi.fn(() => ({
    limit: vi.fn(async () => ({ data, error })),
  }));
  mockSelect.mockReturnValue({ order });
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => (table === 'diagnoses' ? { select: mockSelect } : {}),
    storage: {
      from: () => ({ createSignedUrl: mockSignedUrl }),
    },
  },
}));

const now = new Date('2026-09-23T09:24:00.000Z').toISOString();

const scanFixture = [
  {
    id: 'd2',
    crop: 'Tomato',
    status: 'success',
    disease: 'Early blight',
    confidence: 'Medium',
    advisory_text: 'Remove affected leaves, avoid overhead watering, and rotate crops next season.',
    image_path: 'user-1/d2.png',
    created_at: now,
  },
  {
    id: 'd1',
    crop: 'Tomato',
    status: 'success',
    disease: 'Healthy',
    confidence: null,
    advisory_text: null,
    image_path: 'user-1/d1.png',
    created_at: new Date('2026-09-20T08:00:00.000Z').toISOString(),
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <HealthPage />
    </MemoryRouter>,
  );
}

describe('HealthPage — empty state', () => {
  it('shows the empty state and a link to Scan when there is no history', async () => {
    mockDiagnosesQuery([], null);
    mockSignedUrl.mockResolvedValue({ data: null, error: new Error("none") });
    renderPage();

    expect(await screen.findByRole('heading', { name: 'No crop history yet' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Crop Health' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Scan your first crop' })).toHaveAttribute('href', '/scan');
  });
});

describe('HealthPage — real history', () => {
  it('renders current status, monitor note, and scans grouped by crop', async () => {
    mockDiagnosesQuery(scanFixture, null);
    mockSignedUrl.mockImplementation(async (path: string) => ({ data: { signedUrl: `https://obj/${path}` }, error: null }));
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Early blight' })).toBeInTheDocument();
    expect(screen.getByText('Possible issue')).toBeInTheDocument();
    expect(screen.getAllByText('Tomato').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Confidence: Medium').length).toBeGreaterThanOrEqual(1);

    expect(screen.getByRole('heading', { name: 'What to monitor now' })).toBeInTheDocument();
    expect(screen.getByText(/Remove affected leaves/)).toBeInTheDocument();

    const group = screen.getByRole('heading', { name: 'Tomato' });
    expect(group).toBeInTheDocument();
    expect(screen.getByText('2 scans')).toBeInTheDocument();

    const imgs = await screen.findAllByRole('img');
    expect(imgs.length).toBeGreaterThanOrEqual(3);
    expect(imgs[0]).toHaveAttribute('alt', expect.stringContaining('Tomato') as unknown as string);
    expect(imgs[0]).toHaveAttribute('alt', expect.stringContaining('leaf on') as unknown as string);

    expect(screen.queryByText(/improving|declining|trend/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Scan a crop' })).toHaveAttribute('href', '/scan');
  });

  it('shows an honest card when the latest scan failed', async () => {
    mockDiagnosesQuery(
      [
        {
          id: 'd3',
          crop: 'Chili',
          status: 'failed',
          disease: null,
          confidence: null,
          advisory_text: null,
          image_path: 'user-1/d3.png',
          created_at: now,
        },
        ...scanFixture,
      ],
      null,
    );
    mockSignedUrl.mockImplementation(async (path: string) => ({ data: { signedUrl: `https://obj/${path}` }, error: null }));
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Your latest scan did not complete' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chili' })).toBeInTheDocument();
    expect(screen.getByText('Scan did not complete')).toBeInTheDocument();
  });

  it('never fabricates an advisory when none is on record', async () => {
    mockDiagnosesQuery(scanFixture, null);
    mockSignedUrl.mockImplementation(async (path: string) => ({ data: { signedUrl: `https://obj/${path}` }, error: null }));
    renderPage();

    await screen.findByRole('heading', { name: 'Early blight' });
    expect(screen.queryByText(/improving|declining|trend/)).not.toBeInTheDocument();
  });
});

describe('HealthPage — query failure', () => {
  it('shows an honest error and a retry button', async () => {
    mockDiagnosesQuery(null, { message: 'connection refused' });
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Could not load your scan history' })).toBeInTheDocument(),
    );
    expect(screen.getByText(/connection refused/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});