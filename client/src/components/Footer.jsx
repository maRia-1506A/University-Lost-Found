import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <Link to="/" className="footer-brand">
          <img src="/logo.png" alt="UniFind Logo" className="footer-logo-img" />
          <span className="footer-brand-text">UniFind</span>
        </Link>
        <p className="footer-text">
          Campus Lost &amp; Found &middot; Reuniting lost possessions across campus
        </p>
      </div>
    </footer>
  );
}
