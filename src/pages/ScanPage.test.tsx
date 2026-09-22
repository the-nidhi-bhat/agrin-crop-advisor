import { act, fireEvent, render, screen } from '@testing-library/react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../hooks/useAuth';
import { ScanPage } from './ScanPage';

const { mockInvoke, mockUpload } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockUpload: vi.fn(),
}));

const diagnosisFixture = {
  id: 'd1',
  disease: 'Healthy',
  symptoms: 'The leaf looks green and uniform.',
  advisory: 'No action needed.',
  confidence: null,
};
const advisoryFixture = { advisory: 'No action needed.', weather: null };
const deliverFixture = {
  translatedAdvisory: 'ಮುಂದುವರಿಸಿ.',
  smsStatus: { simulated: true, to: null },
};

vi.mock('@supabase/supabase-js', () => {
  class MockFunctionsHttpError extends Error {
    context: unknown;
    constructor(context?: unknown) {
      super('FunctionsHttpError');
      this.context = context;
    }
  }
  class MockFunctionsRelayError extends Error {
    context: unknown;
    constructor(context?: unknown) {
      super('FunctionsRelayError');
      this.context = context;
    }
  }
  class MockFunctionsFetchError extends Error {
    constructor() {
      super('FunctionsFetchError');
    }
  }
  const supabase = {
    functions: { invoke: mockInvoke },
    storage: { from: () => ({ upload: mockUpload }) },
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      signInAnonymously: vi.fn(async () => ({ data: { data: null }, error: null })),
      onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
        callback('SIGNED_IN', { user: { id: 'user-1' } });
        return { data: { subscription: { unsubscribe: () => {} } } };
      }),
    },
  };
  return {
    FunctionsHttpError: MockFunctionsHttpError,
    FunctionsRelayError: MockFunctionsRelayError,
    FunctionsFetchError: MockFunctionsFetchError,
    createClient: () => supabase,
  };
});

// Avoid touching the real constructor signature — the frontend only needs
// instanceof + context.json() to map a friendly message.
function httpError(code: string): FunctionsHttpError {
  return Object.assign(Object.create(FunctionsHttpError.prototype as object), {
    context: { json: async () => ({ error: { code } }) },
  }) as FunctionsHttpError;
}

async function renderScanPage() {
  render(
    <MemoryRouter>
      <AuthProvider>
        <ScanPage />
      </AuthProvider>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Scan your crop' });
}

function choosePhoto(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, {
    target: { files: [new File(['fake-image-bytes'], 'leaf.png', { type: 'image/png' })] },
  });
}

function clickScan() {
  fireEvent.click(screen.getByRole('button', { name: 'Scan crop' }));
}

async function seedHappyFlow() {
  mockUpload.mockResolvedValue({ error: null });
  mockInvoke.mockImplementation(async (path: string) => {
    if (path === 'diagnose') return { data: diagnosisFixture, error: null };
    if (path === 'advisory') return { data: advisoryFixture, error: null };
    return { data: deliverFixture, error: null };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpload.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ScanPage — submit validation', () => {
  it('keeps Scan crop disabled until a photo is chosen', async () => {
    await renderScanPage();
    expect(screen.getByRole('button', { name: 'Scan crop' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Scan crop' }));
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('ScanPage — happy path', () => {
  it('walks through upload → diagnose → advisory → deliver and shows the result', async () => {
    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <ScanPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Scan your crop' });
    await seedHappyFlow();

    choosePhoto(container);
    expect(screen.getByText(/Ready to scan Tomato · leaf.png/)).toBeInTheDocument();
    clickScan();

    expect(
      await screen.findByRole('heading', { level: 1, name: "Here's what we found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Healthy' })).toBeInTheDocument();
    expect(screen.queryByText(/Confidence:/)).toBeNull();

    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/.+\.png$/),
      expect.any(File),
      { contentType: 'image/png' },
    );
    expect(mockInvoke).toHaveBeenNthCalledWith(
      1,
      'diagnose',
      expect.objectContaining({ body: expect.objectContaining({ imageUrl: expect.stringMatching(/^user-1\//), crop: 'Tomato' }) }),
    );
    expect(mockInvoke).toHaveBeenNthCalledWith(
      2,
      'advisory',
      expect.objectContaining({ body: expect.objectContaining({ diagnosisId: 'd1' }) }),
    );
    expect(mockInvoke).toHaveBeenNthCalledWith(
      3,
      'deliver',
      expect.objectContaining({ body: expect.objectContaining({ diagnosisId: 'd1' }) }),
    );
  });

  it('resets back to a clean form from Scan another crop', async () => {
    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <ScanPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Scan your crop' });
    await seedHappyFlow();

    choosePhoto(container);
    clickScan();
    await screen.findByRole('heading', { level: 1, name: "Here's what we found" });

    fireEvent.click(screen.getByRole('button', { name: 'Scan another crop' }));
    expect(await screen.findByRole('button', { name: 'Scan crop' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scan crop' })).toBeDisabled();
    expect(screen.queryByText(/Ready to scan Tomato/)).toBeNull();
  });
});

describe('ScanPage — failure and retry', () => {
  it('shows the honest rate-limit message and lets the user retry with the same photo', async () => {
    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <ScanPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Scan your crop' });
    mockUpload.mockResolvedValue({ error: null });

    let calls = 0;
    mockInvoke.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) throw httpError('resource-exhausted');
      if (calls === 2) return { data: diagnosisFixture, error: null };
      if (calls === 3) return { data: advisoryFixture, error: null };
      return { data: deliverFixture, error: null };
    });

    choosePhoto(container);
    clickScan();

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('You have reached the scan limit for this hour.');
    expect(screen.getByRole('button', { name: 'Scan crop' })).toBeEnabled();

    clickScan();
    expect(
      await screen.findByRole('heading', { level: 1, name: "Here's what we found" }),
    ).toBeInTheDocument();
  });

  it('shows a generic failure when the photo upload itself fails', async () => {
    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <ScanPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Scan your crop' });
    mockUpload.mockResolvedValue({ error: new Error('permission denied') });

    choosePhoto(container);
    clickScan();

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Something went wrong while scanning. Please try again.');
  });
});

describe('ScanPage — slow analysis and stale requests', () => {
  it('surfaces a retry option when analysis drags past the threshold', async () => {
    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <ScanPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Scan your crop' });
    await seedHappyFlow();
    let resolveDeliver: ((value: unknown) => void) | undefined;
    const gate = new Promise<unknown>((resolve) => {
      resolveDeliver = resolve;
    });
    mockInvoke.mockImplementation(async (path: string) => {
      if (path === 'diagnose') return { data: diagnosisFixture, error: null };
      if (path === 'advisory') return { data: advisoryFixture, error: null };
      return { data: gate, error: null };
    });

    vi.useFakeTimers();
    choosePhoto(container);
    clickScan();
    await act(async () => {});

    expect(screen.getByRole('heading', { name: 'Analyzing your Tomato' })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(45_000);
    });
    expect(screen.getByRole('status')).toHaveTextContent('taking longer than expected');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();

    resolveDeliver?.(deliverFixture);
    await act(async () => {});
  });

  it('ignores a stale in-flight request after the user starts over', async () => {
    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <ScanPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Scan your crop' });
    await seedHappyFlow();
    let resolveDeliver: ((value: unknown) => void) | undefined;
    const gate = new Promise<unknown>((resolve) => {
      resolveDeliver = resolve;
    });
    mockInvoke.mockImplementation(async (path: string) => {
      if (path === 'diagnose') return { data: diagnosisFixture, error: null };
      if (path === 'advisory') return { data: advisoryFixture, error: null };
      return { data: gate, error: null };
    });

    vi.useFakeTimers();
    choosePhoto(container);
    clickScan();
    await act(async () => {});
    await act(async () => {
      await vi.advanceTimersByTimeAsync(45_000);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('button', { name: 'Scan crop' })).toBeInTheDocument();

    resolveDeliver?.(deliverFixture);
    await act(async () => {});
    expect(
      screen.queryByRole('heading', { level: 1, name: "Here's what we found" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scan crop' })).toBeInTheDocument();

    clickScan();
    await act(async () => {});
    expect(
      screen.getByRole('heading', { level: 1, name: "Here's what we found" }),
    ).toBeInTheDocument();
  });
});