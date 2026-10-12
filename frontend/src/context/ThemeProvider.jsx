import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  readSettings,
  writeSettings,
  resetSettingsToDefault,
  VALID_THEMES,
  VALID_VIEW_MODES,
  VALID_TOP_LIMITS,
} from '../utils/settingsStorage';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);
export const useSettings = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => readSettings());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    if (settings.reducedMotion) {
      document.documentElement.setAttribute('data-reduced-motion', 'true');
    } else {
      document.documentElement.removeAttribute('data-reduced-motion');
    }
  }, [settings.theme, settings.reducedMotion]);

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = writeSettings({ ...prev, ...patch });
      return next;
    });
  }, []);

  const setTheme = useCallback(
    (nextTheme) => {
      if (!VALID_THEMES.includes(nextTheme)) return;
      updateSettings({ theme: nextTheme });
    },
    [updateSettings]
  );

  const toggleTheme = useCallback(() => {
    setSettings((prev) => {
      const nextTheme = prev.theme === 'light' ? 'dark' : 'light';
      return writeSettings({ ...prev, theme: nextTheme });
    });
  }, []);

  const setDefaultViewMode = useCallback(
    (viewMode) => {
      if (!VALID_VIEW_MODES.includes(viewMode)) return;
      updateSettings({ defaultViewMode: viewMode });
    },
    [updateSettings]
  );

  const setDefaultTopLimit = useCallback(
    (limit) => {
      const num = Number(limit);
      if (!VALID_TOP_LIMITS.includes(num)) return;
      updateSettings({ defaultTopLimit: num });
    },
    [updateSettings]
  );

  const setReducedMotion = useCallback(
    (enabled) => {
      updateSettings({ reducedMotion: Boolean(enabled) });
    },
    [updateSettings]
  );

  const resetPreferences = useCallback(() => {
    const defaults = resetSettingsToDefault();
    setSettings(defaults);
    return defaults;
  }, []);

  const value = useMemo(
    () => ({
      theme: settings.theme,
      defaultViewMode: settings.defaultViewMode,
      defaultTopLimit: settings.defaultTopLimit,
      reducedMotion: settings.reducedMotion,
      settings,
      setTheme,
      toggleTheme,
      setDefaultViewMode,
      setDefaultTopLimit,
      setReducedMotion,
      resetPreferences,
    }),
    [
      settings,
      setTheme,
      toggleTheme,
      setDefaultViewMode,
      setDefaultTopLimit,
      setReducedMotion,
      resetPreferences,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

