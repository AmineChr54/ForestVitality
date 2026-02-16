// Theme Hook - Manages dark/light theme with localStorage persistence
import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'forest-vitality-theme';
const DEFAULT_THEME: Theme = 'light';

function getInitialTheme(): Theme {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') return stored;
    } catch {
        // localStorage unavailable
    }
    return DEFAULT_THEME;
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme);

    // Apply theme to document on mount and change
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            // localStorage unavailable
        }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
    }, []);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
    }, []);

    return { theme, toggleTheme, setTheme } as const;
}
