import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ScanResult, type ScanResultData } from './ScanResult';
import { translateAdvisory } from '../../lib/translate';

vi.mock('../../lib/translate', () => ({
  translateAdvisory: vi.fn(),
}));

const mockTranslate = vi.mocked(translateAdvisory);
const KANNADA_TEXT = 'ಅನುಭವಿಸಿದ ಎಲೆಗಳನ್ನು ತೆಗೆದುಹಾಕಿ.';
const HINDI_TEXT = 'संक्रमित पत्तियों को हटा दें।';

type SpeechStub = {
  latest: {
    text: string;
    voice: { lang: string } | null;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
  } | null;
  speak: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  getVoices: ReturnType<typeof vi.fn>;
};

function speechStub(): SpeechStub {
  return globalThis.speechSynthesis as unknown as SpeechStub;
}

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
      screen.getByRole('heading', { level: 2, name: /02Why this result?/ }),
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
    const list = document.querySelector('ul.list-disc');
    expect(list).not.toBeNull();
    const bullets = list!.querySelectorAll('li');
    expect(bullets).toHaveLength(2);
    expect(bullets[0]).toHaveTextContent('Brown spots on the lower leaves.');
    expect(bullets[1]).toHaveTextContent('The edges are curling.');
  });

  it('keeps a single short symptom as a readable paragraph', () => {
    renderResult({ result: makeResult({ symptoms: 'The leaf is yellowing.' }) });
    expect(document.querySelector('ul.list-disc')).toBeNull();
    expect(screen.getByText('The leaf is yellowing.')).toBeInTheDocument();
  });

  it('still renders many long sentences as readable bullets', () => {
    const long =
      'First the lower leaves yellow. Then dark spots appear at the edges. The spots spread inward. ' +
      'Leaves eventually curl and drop. The plant may stall its growth.';
    renderResult({ result: makeResult({ symptoms: long }) });
    expect(document.querySelector('ul.list-disc')?.querySelectorAll('li')).toHaveLength(5);
  });

  it('omits the symptoms section entirely when the backend gives none', () => {
    renderResult({ result: makeResult({ symptoms: '' }) });
    expect(document.querySelector('ul.list-disc')).toBeNull();
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
    mockTranslate.mockReset();
    speechStub().getVoices.mockReset().mockImplementation(() => []);
  });

  const languageSelect = () => screen.getByRole('combobox', { name: 'Guidance language' });

  const setVoices = (langs: string[]) => {
    speechStub().getVoices.mockReturnValue(langs.map((lang) => ({ lang })));
  };

  it('shows English guidance by default with all nine languages to choose from', () => {
    renderResult();
    const select = languageSelect() as HTMLSelectElement;
    expect(select.value).toBe('en');
    expect(screen.getAllByRole('option')).toHaveLength(9);
    expect(screen.getByRole('option', { name: 'हिन्दी · Hindi' })).toBeInTheDocument();
    expect(screen.getByText('English guidance')).toBeInTheDocument();
    expect(screen.getAllByText(makeResult().advisory).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Play English audio' })).toBeInTheDocument();
    expect(mockTranslate).not.toHaveBeenCalled();
  });

  it('switches to the cached Kannada translation when chosen', () => {
    renderResult();
    fireEvent.change(languageSelect(), { target: { value: 'kn' } });
    expect(screen.getByText('Kannada guidance')).toBeInTheDocument();
    const kannada = screen.getAllByText(KANNADA_TEXT)[0];
    expect(kannada).toHaveAttribute('lang', 'kn');
    expect((languageSelect() as HTMLSelectElement).value).toBe('kn');
    expect(mockTranslate).not.toHaveBeenCalled();
  });

  it('applies a stored Kannada preference as the default view', () => {
    window.localStorage.setItem('agrin_language', 'kn');
    renderResult();
    expect(screen.getAllByText(KANNADA_TEXT)[0]).toHaveAttribute('lang', 'kn');
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('kn');
  });

  it('loads guidance in a stored language that has no cached translation', async () => {
    window.localStorage.setItem('agrin_language', 'hi');
    mockTranslate.mockResolvedValue({ language: 'hi', translatedText: HINDI_TEXT });
    renderResult();
    const hindi = await screen.findByText(HINDI_TEXT);
    expect(hindi).toHaveAttribute('lang', 'hi');
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('hi');
    expect(mockTranslate).toHaveBeenCalledWith('d1', 'hi');
  });

  it('translates on demand when a non-cached language is picked', async () => {
    mockTranslate.mockResolvedValue({ language: 'hi', translatedText: HINDI_TEXT });
    renderResult();
    fireEvent.change(languageSelect(), { target: { value: 'hi' } });
    expect(screen.getByText(/Loading guidance in Hindi/)).toBeInTheDocument();
    expect(mockTranslate).toHaveBeenCalledWith('d1', 'hi');
    const hindi = await screen.findByText(HINDI_TEXT);
    expect(hindi).toHaveAttribute('lang', 'hi');
    expect(screen.getByText('Hindi guidance')).toBeInTheDocument();
  });

  it('keeps the last available guidance and explains when a translation fails', async () => {
    mockTranslate.mockRejectedValue(
      new Error('AgriN could not load the guidance right now. Please try again in a moment.'),
    );
    renderResult();
    fireEvent.change(languageSelect(), { target: { value: 'hi' } });
    await screen.findByRole('alert');
    expect((languageSelect() as HTMLSelectElement).value).toBe('en');
    expect(screen.getByText('English guidance')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load guidance in Hindi.");
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    mockTranslate.mockResolvedValue({ language: 'hi', translatedText: HINDI_TEXT });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    const hindi = await screen.findByText(HINDI_TEXT);
    expect(hindi).toHaveAttribute('lang', 'hi');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('still offers all nine languages even without a stored Kannada translation', () => {
    renderResult({ result: makeResult({ translatedAdvisory: '' }) });
    expect(screen.getAllByRole('option')).toHaveLength(9);
    expect(screen.getByRole('option', { name: 'ಕನ್ನಡ · Kannada' })).toBeInTheDocument();
    expect(screen.getByText('English guidance')).toBeInTheDocument();
  });

  it('speaks the English advisory when an English voice is available', () => {
    setVoices(['en-IN']);
    renderResult();
    fireEvent.click(screen.getByRole('button', { name: 'Play English audio' }));
    expect(speechStub().latest?.text).toBe(makeResult().advisory);
    expect(speechStub().latest?.voice?.lang).toBe('en-IN');
    expect(screen.getByRole('button', { name: 'Stop English audio' })).toBeInTheDocument();
  });

  it('speaks the Kannada text when Kannada is selected and a Kannada voice is available', () => {
    setVoices(['kn-IN']);
    renderResult();
    fireEvent.change(languageSelect(), { target: { value: 'kn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Play Kannada audio' }));
    expect(speechStub().latest?.text).toBe(KANNADA_TEXT);
    expect(screen.getByRole('button', { name: 'Stop Kannada audio' })).toBeInTheDocument();
  });

  it('refuses to speak (never silently substitutes a wrong-language voice)', () => {
    renderResult();
    const button = screen.getByRole('button', { name: 'Play English audio' });
    expect(button).toBeDisabled();
    expect(
      screen.getByText(/voice isn't installed on this device — you can still read the guidance/),
    ).toBeInTheDocument();
    fireEvent.click(button);
    expect(speechStub().speak).not.toHaveBeenCalled();
  });

  it('recovers when audio errors out', () => {
    setVoices(['en-IN']);
    renderResult();
    fireEvent.click(screen.getByRole('button', { name: 'Play English audio' }));
    expect(screen.getByRole('button', { name: 'Stop English audio' })).toBeInTheDocument();
    act(() => speechStub().latest?.onerror?.());
    const button = screen.getByRole('button', { name: 'Play English audio' });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
  });

  it('reads the English advisory when the device has no voice for the shown language', () => {
    setVoices(['en-US']);
    renderResult();
    fireEvent.change(languageSelect(), { target: { value: 'kn' } });
    // The Kannada text is on screen, but the only installed voice is English.
    expect(screen.getAllByText(KANNADA_TEXT)[0]).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Play English audio' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    // It speaks English text in English — never Kannada text in an English voice.
    expect(speechStub().latest?.text).toBe(makeResult().advisory);
    expect(speechStub().latest?.voice?.lang).toBe('en-US');
    expect(
      screen.getByText(/Kannada voice isn't installed on this device/),
    ).toBeInTheDocument();
  });
});

describe('ScanResult — audio unavailable on device', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('disables audio and says so when speech synthesis is unsupported', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    window.localStorage.clear();
    renderResult();
    expect(screen.getByText("Audio isn't available on this device.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play English audio' })).toBeDisabled();
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

describe('ScanResult — simple presentation mode', () => {
  beforeEach(() => {
    localStorage.setItem('agrin_presentation', 'simple');
  });
  afterEach(() => {
    localStorage.removeItem('agrin_presentation');
  });

  it('renders the farmer-friendly structure with a monitoring link', () => {
    renderResult();
    expect(screen.getByText('What AgriN found')).toBeInTheDocument();
    expect(screen.getByText('What you may notice')).toBeInTheDocument();
    expect(screen.getByText('Do now')).toBeInTheDocument();
    expect(screen.getAllByText('Keep watching').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Listen to the guidance')).toBeInTheDocument();
    const monitor = screen.getByRole('link', { name: 'Keep monitoring this crop' });
    expect(monitor).toHaveAttribute('href', '/health');
  });

  it('keeps evidence honest and scoped in simple mode', () => {
    renderResult();
    const list = document.querySelector('ul.list-disc');
    expect(list).not.toBeNull();
    expect(list!.querySelectorAll('li')).toHaveLength(2);
    expect(list!.querySelectorAll('li')[0]).toHaveTextContent('Brown spots on the lower leaves.');
    expect(screen.getByText('Confidence: High')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /02Why this result?/ })).toBeNull();
  });

  it('leaves the detailed numbered sections out', () => {
    renderResult();
    expect(screen.queryByRole('heading', { name: /01Diagnosis/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: /03What to do now/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: /04Keep monitoring/ })).toBeNull();
  });
});