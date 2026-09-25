import { useCallback, useEffect, useState } from 'react';

export type ThemeSetting = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'agrin_theme';
const LIGHT_COLOR = '#f7f5ef';
const DARK_COLOR = '#0d120e';

function media() {
  return window.matchMedia('(prefers-color-scheme: dark)');
}

function resolve(setting: ThemeSetting): Theme {
  if (setting === 'dark' || (setting === 'system' && media().matches)) {
    return 'dark';
  }
  return 'light';
}

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? DARK_COLOR : LIGHT_COLOR);
  }
}

function readSetting(): ThemeSetting {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

export function useTheme() {
  const [setting, setSetting] = useState<ThemeSetting>(readSetting);

  useEffect(() => {
    apply(resolve(setting));
    if (setting !== 'system') {
      return;
    }
    const onChange = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light');
    media().addEventListener('change', onChange);
    return () => media().removeEventListener('change', onChange);
  }, [setting]);

  const setTheme = useCallback((next: ThemeSetting) => {
    localStorage.setItem(STORAGE_KEY, next);
    setSetting(next);
  }, []);

  return {
    theme: setting,
    resolved: resolve(setting),
    setTheme,
  };
}