// Sidebar Component - Navigation with Collapse/Expand
import { useState, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../hooks';
import { canAnalyze } from '../../utils/roleUtils';
import './Sidebar.css';

interface NavItem {
    path: string;
    label: string;
    icon: string;
    requiresAnalyze?: boolean;
}

const NAV_ITEMS: NavItem[] = [
    { path: ROUTES.REGION_SELECT, label: 'Regionen', icon: '🗺️' },
    { path: ROUTES.INDEX_ANALYSIS, label: 'Analyse', icon: '📊', requiresAnalyze: true },
    { path: ROUTES.SPLIT_COMPARISON, label: 'Vergleich', icon: '⚖️', requiresAnalyze: true },
];

const STORAGE_KEY = 'sidebar-collapsed';

const getInitialCollapsed = (): boolean => {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
};

export const Sidebar = () => {
    const { user } = useAuth();
    const [collapsed, setCollapsed] = useState(getInitialCollapsed);

    const toggleCollapsed = useCallback(() => {
        setCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* noop */ }
            return next;
        });
    }, []);

    const visibleNavItems = NAV_ITEMS.filter(item => {
        if (item.requiresAnalyze) {
            return canAnalyze(user);
        }
        return true;
    });

    return (
        <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
            <div className="sidebar-content">
                <div className="sidebar-header">
                    <div className="logo">
                        <span className="logo-icon">🌲</span>
                        <span className="logo-text">VitalityForest</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {visibleNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            title={collapsed ? item.label : undefined}
                            className={({ isActive }) =>
                                `nav-item ${isActive ? 'nav-item--active' : ''}`
                            }
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>

            <button
                className="sidebar-toggle"
                onClick={toggleCollapsed}
                title={collapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                <span className="sidebar-toggle-icon">
                    {collapsed ? '»' : '«'}
                </span>
            </button>
        </aside>
    );
};
