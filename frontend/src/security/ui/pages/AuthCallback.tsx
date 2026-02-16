import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SecurityAPI } from "../../SecurityAPI";
import { SecurityConfig } from "../../SecurityConfig";

export function AuthCallback() {
  const navigate = useNavigate();
  const handledRef = useRef(false);
  const [status, setStatus] = useState<string>("Signing you in...");

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      setStatus("No authentication code found. Redirecting...");
      setTimeout(() => navigate(SecurityConfig.routes.loginPath, { replace: true }), 2000);
      return;
    }

    setStatus("Exchanging code for token...");
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
      .catch((err) => {
        const msg = err?.message || "Unknown error";
        setStatus(`System error: ${msg}`);
        console.error("Auth callback crashed:", err);
      });
  }, [navigate]);

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
