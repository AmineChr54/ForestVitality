// Theme Toggle Component - Animated sun/moon switch
import { useTheme } from '../../hooks/useTheme';
import './ThemeToggle.css';

export const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            className={`theme-toggle ${isDark ? 'theme-toggle--dark' : ''}`}
            onClick={toggleTheme}
            title={isDark ? 'Zum hellen Modus wechseln' : 'Zum dunklen Modus wechseln'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <span className="theme-toggle__track">
                <span className="theme-toggle__thumb">
                    <span className="theme-toggle__icon">
                        {isDark ? '🌙' : '☀️'}
                    </span>
                </span>
            </span>
        </button>
    );
};
