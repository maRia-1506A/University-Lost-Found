import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <Link to="/" className="footer-brand">
          <img src="/logo.png" alt="UniFind" className="footer-logo-img" />
          <span className="footer-brand-name">UniFind</span>
        </Link>

        <p className="footer-tagline">
          Reuniting lost possessions across campus
        </p>

        <span className="footer-copy">
          &copy; {new Date().getFullYear()} UniFind
        </span>
      </div>
    </footer>
  );
}
