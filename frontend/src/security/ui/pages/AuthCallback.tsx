import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SecurityAPI } from "../../SecurityAPI";
import { SecurityConfig } from "../../SecurityConfig";

export function AuthCallback() {
  const navigate = useNavigate();
  const handledRef = useRef(false);
  // The authorization code is fixed for the lifetime of this page
  const [code] = useState(() => new URLSearchParams(window.location.search).get("code"));
  const [status, setStatus] = useState<string>(() =>
    code ? "Exchanging code for token..." : "No authentication code found. Redirecting..."
  );

  useEffect(() => {
    if (!code) {
      const timer = setTimeout(() => navigate(SecurityConfig.routes.loginPath, { replace: true }), 2000);
      return () => clearTimeout(timer);
    }

    // Authorization codes are single-use: guard against StrictMode's double effect run
    if (handledRef.current) return;
    handledRef.current = true;

    SecurityAPI.handleCallback(code)
      .then((result) => {
        if (result.isSuccess()) {
          setStatus("Success! Redirecting...");
          navigate(SecurityConfig.routes.entryPath, { replace: true });
        } else {
          setStatus(`Authentication failed: ${result.message}`);
          console.error("Auth callback failed:", result.message);
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setStatus(`System error: ${msg}`);
        console.error("Auth callback crashed:", err);
      });
  }, [code, navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'sans-serif',
      gap: '1rem'
    }}>
      <div className="loader-spinner"></div>
      <h3>{status}</h3>
      {status.includes("failed") || status.includes("error") ? (
        <button onClick={() => navigate(SecurityConfig.routes.loginPath, { replace: true })}>
          Return to Login
        </button>
      ) : null}
    </div>
  );
}
