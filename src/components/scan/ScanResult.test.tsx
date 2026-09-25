import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScanResult, type ScanResultData } from './ScanResult';

const KANNADA_TEXT = 'ಅನುಭವಿಸಿದ ಎಲೆಗಳನ್ನು ತೆಗೆದುಹಾಕಿ.';

function makeResult(overrides: Partial<ScanResultData> = {}): ScanResultData {
  return {
    id: 'd1',
    disease: 'Early blight',
    symptoms: 'Brown spots on the lower leaves. The edges are curling.',
    advisory:
      'Remove and dispose of infected leaves. Keep the base dry and avoid watering overhead.',
    confidence: 'High',
    weather: null,
    translatedAdvisory: KANNADA_TEXT,
    smsStatus: { simulated: true, to: '98765 43210' },
    ...overrides,
  };
}

interface RenderOptions {
  result?: ScanResultData;
  crop?: string;
  imageUrl?: string | null;
  onReset?: () => void;
}

function renderResult(options: RenderOptions = {}) {
  const { result = makeResult(), crop = 'Tomato', imageUrl = 'blob:mock-url', onReset = vi.fn() } =
    options;
  render(
    <MemoryRouter>
      <ScanResult result={result} crop={crop} imageUrl={imageUrl} onReset={onReset} />
    </MemoryRouter>,
  );
  return { onReset };
}

describe('ScanResult — hierarchy and structure', () => {
  it('renders header, sections and actions in order', () => {
    renderResult();

    expect(screen.getByText('Tomato · Scan result')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: "Here's what we found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /01Diagnosis/ })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /02Signs in the photo/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /03What to do now/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /04Keep monitoring/ }),
    ).toBeInTheDocument();
  });

  it('shows the scan photo with meaningful alt text when available', () => {
    renderResult();
    const img = screen.getByRole('img', {
      name: 'Photo of the Tomato leaf this result is based on',
    });
    expect(img).toHaveAttribute('src', 'blob:mock-url');
  });

  it('omits the photo when no preview is available', () => {
    renderResult({ imageUrl: null });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('ScanResult — diagnosis and health state', () => {
  it('marks a disease result as a possible issue', () => {
    renderResult({ result: makeResult({ disease: 'Early blight' }) });
    expect(screen.getByText('Possible issue')).toBeInTheDocument();
  });

  it('marks a Healthy result as healthy', () => {
    renderResult({ result: makeResult({ disease: 'Healthy' }) });
    expect(screen.getByText('Looks healthy')).toBeInTheDocument();
  });

  it('marks an unrecognized result as unrecognized', () => {
    renderResult({ result: makeResult({ disease: 'Unrecognized' }) });
    expect(screen.getByText('Pattern not recognized')).toBeInTheDocument();
  });

  it('does not invent a health state for a missing disease label', () => {
    renderResult({ result: makeResult({ disease: '' }) });
    expect(screen.queryByText(/Possible issue|Looks healthy|Pattern not recognized/)).toBeNull();
  });

  it('renders a long diagnosis name without breaking', () => {
    const longName = 'Bacterial leaf spot caused by a combination of moisture stress';
    renderResult({ result: makeResult({ disease: longName }) });
    expect(screen.getByRole('heading', { level: 3, name: longName })).toBeInTheDocument();
  });

  it('shows the crop chip', () => {
    renderResult({ crop: 'Chili' });
    expect(screen.getByText('Chili')).toBeInTheDocument();
  });
});

describe('ScanResult — confidence honesty', () => {
  it('shows confidence when the backend provides it', () => {
    renderResult({ result: makeResult({ confidence: 'High' }) });
    expect(screen.getByText('Confidence: High')).toBeInTheDocument();
  });

  it('renders Low confidence with its label', () => {
    renderResult({ result: makeResult({ confidence: 'Low' }) });
    expect(screen.getByText('Confidence: Low')).toBeInTheDocument();
  });

  it('does NOT show any confidence when the backend returns null', () => {
    renderResult({ result: makeResult({ confidence: null }) });
    expect(screen.queryByText(/Confidence:/)).toBeNull();
  });
});

describe('ScanResult — symptoms', () => {
  it('turns multi-sentence symptoms into bullets', () => {
    renderResult();
    const bullets = screen.getAllByRole('listitem');
    expect(bullets).toHaveLength(2);
    expect(bullets[0]).toHaveTextContent('Brown spots on the lower leaves.');
    expect(bullets[1]).toHaveTextContent('The edges are curling.');
  });

  it('keeps a single short symptom as a readable paragraph', () => {
    renderResult({ result: makeResult({ symptoms: 'The leaf is yellowing.' }) });
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByText('The leaf is yellowing.')).toBeInTheDocument();
  });

  it('still renders many long sentences as readable bullets', () => {
    const long =
      'First the lower leaves yellow. Then dark spots appear at the edges. The spots spread inward. ' +
      'Leaves eventually curl and drop. The plant may stall its growth.';
    renderResult({ result: makeResult({ symptoms: long }) });
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('omits the symptoms section entirely when the backend gives none', () => {
    renderResult({ result: makeResult({ symptoms: '' }) });
    expect(screen.queryByRole('heading', { name: '02 Signs in the photo' })).toBeNull();
  });
});

describe('ScanResult — advisory honesty', () => {
  it('shows the actual advisory text without adding content', () => {
    const advisory =
      'Remove and dispose of infected leaves. Keep the base dry and avoid watering overhead.';
    renderResult({ result: makeResult({ advisory }) });
    expect(screen.getAllByText(advisory).length).toBeGreaterThan(0);
  });

  it('renders a long advisory without breaking', () => {
    const long = Array.from({ length: 6 }, (_, i) => `Step ${i + 1}: check the leaf again.`).join(' ');
    renderResult({ result: makeResult({ advisory: long }) });
    expect(screen.getAllByText(long).length).toBeGreaterThan(0);
  });

  it('omits the advisory section when the backend provides none', () => {
    renderResult({ result: makeResult({ advisory: '' }) });
    expect(screen.queryByRole('heading', { name: '03 What to do now' })).toBeNull();
  });

  it('never fabricates weather data', () => {
    renderResult();
    expect(screen.queryByText(/humidity|°C|forecast/i)).toBeNull();
  });
});

describe('ScanResult — guidance language and audio', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows English guidance by default with a language switch', () => {
    renderResult();
    expect(screen.getByRole('heading', { level: 3, name: 'Language guidance' })).toBeInTheDocument();
    expect(screen.getByText('English guidance')).toBeInTheDocument();
    expect(screen.getAllByText(makeResult().advisory).length).toBeGreaterThan(0);
    expect(screen.getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'ಕನ್ನಡ' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('button', { name: 'Play English audio' })).toBeInTheDocument();
  });

  it('switches to Kannada guidance with lang="kn" when chosen', () => {
    renderResult();
    fireEvent.click(screen.getByRole('radio', { name: 'ಕನ್ನಡ' }));
    expect(screen.getByText('Kannada guidance')).toBeInTheDocument();
    const kannada = screen.getByText(KANNADA_TEXT);
    expect(kannada).toHaveAttribute('lang', 'kn');
    expect(screen.getByRole('radio', { name: 'ಕನ್ನಡ' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Play Kannada audio' })).toBeInTheDocument();
  });

  it('persists a stored Kannada preference as the default view', () => {
    window.localStorage.setItem('agrin_language', 'kn');
    renderResult();
    expect(screen.getByText(KANNADA_TEXT)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play Kannada audio' })).toBeInTheDocument();
  });

  it('hides the Kannada option when the backend returns no translation', () => {
    renderResult({ result: makeResult({ translatedAdvisory: '' }) });
    expect(screen.queryByRole('radio', { name: 'ಕನ್ನಡ' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Play English audio' })).toBeInTheDocument();
  });

  it('speaks the Kannada text via speechSynthesis when Kannada is selected', () => {
    renderResult();
    fireEvent.click(screen.getByRole('radio', { name: 'ಕನ್ನಡ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play Kannada audio' }));
    const speech = globalThis.speechSynthesis as unknown as { latest: { text: string } };
    expect(speech.latest?.text).toBe(KANNADA_TEXT);
    expect(screen.getByRole('button', { name: 'Stop Kannada audio' })).toBeInTheDocument();
  });

  it('speaks the English advisory when English is the selected guidance', () => {
    renderResult();
    fireEvent.click(screen.getByRole('button', { name: 'Play English audio' }));
    const speech = globalThis.speechSynthesis as unknown as { latest: { text: string } };
    expect(speech.latest?.text).toBe(makeResult().advisory);
  });

  it('shows a fallback note when no Kannada voice is installed', () => {
    renderResult();
    fireEvent.click(screen.getByRole('radio', { name: 'ಕನ್ನಡ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play Kannada audio' }));
    expect(
      screen.getByText(/closest available voice \(a Kannada voice is not installed/),
    ).toBeInTheDocument();
  });

  it('does not break the page when audio errors out', () => {
    renderResult();
    fireEvent.click(screen.getByRole('radio', { name: 'ಕನ್ನಡ' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play Kannada audio' }));
    const speech = globalThis.speechSynthesis as unknown as {
      latest: { onerror: (() => void) | null };
    };
    expect(screen.getByRole('button', { name: 'Stop Kannada audio' })).toBeInTheDocument();
    act(() => speech.latest.onerror?.());
    const button = screen.getByRole('button', { name: 'Play Kannada audio' });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
  });
});

describe('ScanResult — SMS and trust truthfulness', () => {
  it('explicitly labels a simulated SMS with the destination phone', () => {
    renderResult({ result: makeResult({ smsStatus: { simulated: true, to: '98765 43210' } }) });
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('SMS delivery is simulated (no provider connected)');
    expect(status).toHaveTextContent('98765 43210');
    expect(status).not.toHaveTextContent('SMS sent');
  });

  it('falls back to a generic destination when the phone is unknown', () => {
    renderResult({ result: makeResult({ smsStatus: { simulated: true, to: 'Unknown' } }) });
    expect(screen.getByRole('status')).toHaveTextContent('your phone number');
  });

  it('renders no SMS note when there is no smsStatus', () => {
    renderResult({ result: makeResult({ smsStatus: null }) });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('keeps the AI advisory boundary visible', () => {
    renderResult();
    expect(screen.getByText(/generated by an AI model/)).toBeInTheDocument();
    expect(screen.getByText(/advisory only — not a professional agricultural diagnosis/)).toBeInTheDocument();
  });

  it('does not add metrics or numbers the backend did not provide', () => {
    renderResult({ result: makeResult({ confidence: null }) });
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/\d+%/);
    expect(body).not.toMatch(/accuracy/i);
  });
});

describe('ScanResult — actions', () => {
  it('resets the flow from Scan another crop', () => {
    const { onReset } = renderResult();
    fireEvent.click(screen.getByRole('button', { name: 'Scan another crop' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('links View crop health to /health', () => {
    renderResult();
    const links = screen.getAllByRole('link', { name: 'View crop health' });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/health');
    }
  });

  it('links Back to home to /', () => {
    renderResult();
    const link = screen.getByRole('link', { name: 'Back to home' });
    expect(link).toHaveAttribute('href', '/');
  });
});