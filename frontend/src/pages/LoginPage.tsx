// Login Page Component
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks';
import { ROUTES } from '../constants/routes';
import './LoginPage.css';

const LoginPage = () => {
    const { login, logout, isLoading, error, isAuthenticated, user } = useAuth();

    // If already authenticated, give user choice (prevents loops)
    if (isAuthenticated) {
        return (
            <div className="login-page">
                <div className="login-container">
                    <div className="login-card" style={{ textAlign: 'center', padding: '2rem' }}>
                        <div className="login-logo">
                            <span className="logo-icon">🌲</span>
                        </div>
                        <h3>Willkommen zurück!</h3>
                        <p style={{ margin: '1rem 0' }}>
                            Du bist bereits angemeldet als <strong>{user?.name || 'Benutzer'}</strong>.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                            <Link to={ROUTES.DASHBOARD} className="btn btn-primary">
                                Zum Dashboard
                            </Link>
                            <button onClick={logout} className="btn btn-secondary">
                                Abmelden / Konto wechseln
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const handleKeycloakLogin = async () => {
        await login({} as any); // Credentials not needed, SecurityAPI.login() handles Keycloak redirect
    };

    return (
        <div className="login-page">
            <div className="login-background">
                <div className="bg-gradient"></div>
                <div className="bg-pattern"></div>
            </div>

            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <div className="login-logo">
                            <span className="logo-icon">🌲</span>
                        </div>
                        <h1 className="login-title">VitalityForest</h1>
                        <p className="login-subtitle">Waldgesundheits-Monitoring</p>
                    </div>

                    <div className="login-content">
                        {error && (
                            <div className="alert alert-error">
                                <span className="alert-icon">⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="button"
                            className="btn btn-primary login-btn"
                            onClick={handleKeycloakLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="btn-spinner"></span>
                                    Weiterleitung zu Keycloak...
                                </>
                            ) : (
                                '🔐 Login via Keycloak'
                            )}
                        </button>
                    </div>

                    <div className="login-footer">
                        <p className="demo-hint">
                            Sichere Anmeldung über Keycloak Identity Provider
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
