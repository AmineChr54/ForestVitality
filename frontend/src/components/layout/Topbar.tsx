// Topbar Component - Top navigation bar
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { getPrimaryRole } from '../../utils/roleUtils';
import { ThemeToggle } from './ThemeToggle';
import './Topbar.css';

// Page title mapping
const PAGE_TITLES: Record<string, string> = {
    '/dashboard/region': 'Regionen verwalten',
    '/dashboard/analysis': 'Index-Analyse',
    '/dashboard/compare': 'Vergleichsansicht',
};

export const Topbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    const pageTitle = PAGE_TITLES[location.pathname] || 'Dashboard';
    const userRole = getPrimaryRole(user);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="topbar">
            <div className="topbar-left">
                <h1 className="page-title">{pageTitle}</h1>
                <nav className="breadcrumb">
                    <span className="breadcrumb-item">Dashboard</span>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-item breadcrumb-current">{pageTitle}</span>
                </nav>
            </div>

            <div className="topbar-right">
                <ThemeToggle />
                <div className="user-menu">
                    <div className="user-avatar">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="user-info">
                        <span className="user-name">{user?.name || 'User'}</span>
                        <span className="user-role" style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>
                            {userRole}
                        </span>
                    </div>
                    <button
                        className="logout-btn"
                        onClick={handleLogout}
                        title="Abmelden"
                    >
                        ⬅️
                    </button>
                </div>
            </div>
        </header>
    );
};

