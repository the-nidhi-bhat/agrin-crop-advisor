import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

// jsdom does not implement object URLs.
URL.createObjectURL = vi.fn(() => 'blob:mock-url') as unknown as typeof URL.createObjectURL;
URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL;

// Some jsdom builds predate crypto.randomUUID — keep the flow deterministic.
if (typeof crypto.randomUUID !== 'function') {
  (crypto as { randomUUID?: () => string }).randomUUID = () => 'test-uuid';
}

// jsdom does not implement the Web Speech API. Default: no Kannada voice, and
// onstart fires immediately so state resets naturally on repeat clicks. Tests
// read the captured utterance via (globalThis as any).speechSynthesis.latest.
class MockUtterance {
  text: string;
  lang = '';
  voice: { lang: string } | null = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

const speechStub = {
  latest: null as MockUtterance | null,
  cancel: vi.fn(),
  speak: vi.fn((utterance: MockUtterance) => {
    speechStub.latest = utterance;
    utterance.onstart?.();
  }),
  getVoices: vi.fn(() => []),
  onVoicesChanged: null as (() => void) | null,
  addEventListener: vi.fn((_type: string, listener: () => void) => {
    speechStub.onVoicesChanged = listener;
  }),
  removeEventListener: vi.fn(),
};

globalThis.SpeechSynthesisUtterance = MockUtterance as unknown as typeof SpeechSynthesisUtterance;
globalThis.speechSynthesis = speechStub as unknown as SpeechSynthesis;

afterEach(() => {
  speechStub.latest = null;
  speechStub.cancel.mockClear();
  speechStub.speak.mockClear();
  speechStub.getVoices.mockClear().mockImplementation(() => []);
  speechStub.onVoicesChanged = null;
  document.body.innerHTML = '';
});