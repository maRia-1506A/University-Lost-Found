import React from "react";
import { useAuth } from "../context/AuthContext.jsx";
export default function AuthModal({ onClose, message = "Please sign in with Google to share a lost or found post with the campus community." }) {
  const { signInWithGoogle } = useAuth();
  async function handleSignIn() {
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      alert(err.message || "Failed to sign in");
    }
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "420px",
          textAlign: "center",
          padding: "32px 28px",
          borderRadius: "16px",
        }}
      >
        <div style={{ fontSize: "2.8rem", marginBottom: "12px" }}>🔐</div>
        <h2 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "10px" }}>
          Sign In Required
        </h2>
        <p
          style={{
            fontSize: "0.95rem",
            opacity: 0.85,
            marginBottom: "24px",
            lineHeight: "1.5",
          }}
        >
          {message}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            type="button"
            className="google-signin-btn"
            style={{ width: "100%", justifyContent: "center", padding: "12px" }}
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
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: "100%", marginTop: "4px" }}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}