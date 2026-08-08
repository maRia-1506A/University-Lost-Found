import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar({ onCreatePost }) {
  const { user, signInWithGoogle, signOut } = useAuth();
  const [authError, setAuthError] = useState("");

  async function handleSignIn() {
    setAuthError("");
    try {
      await signInWithGoogle();
    } catch (err) {
      if (err.message?.includes("provider is not enabled") || err.status === 400) {
        setAuthError("Google Login is not enabled in your Supabase Dashboard yet.");
      } else {
        setAuthError(err.message || "Failed to sign in with Google.");
      }
    }
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="brand-badge">U</span>
          <span className="brand-text">
            <strong>UniFind</strong>
            <span>Campus Lost &amp; Found</span>
          </span>
        </Link>

        <div className="navbar-actions">
          {authError && (
            <span className="auth-error-chip" title={authError}>
              ⚠️ {authError}
            </span>
          )}
          {user.isAuthenticated ? (
            <div className="user-profile-menu">
              <Link to={`/profile/${user.id}`} className="user-info user-info-link" title="View your profile">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="user-avatar-img"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="user-avatar-placeholder">
                    {user.initials}
                  </div>
                )}
                <span className="user-name">{user.name}</span>
              </Link>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={signOut}
                title="Sign out of Google"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="google-signin-btn"
              onClick={handleSignIn}
            >
              <svg className="google-icon" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2.01 10.05.01 12c0 1.95.45 3.8 1.26 5.42l4.01-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
