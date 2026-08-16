import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchNotifications, fetchUserConversations } from "../api.js";
import { supabase } from "../supabase.js";
import NotificationDropdown from "./NotificationDropdown.jsx";
import ConversationsDropdown from "./ConversationsDropdown.jsx";
import ChatModal from "./ChatModal.jsx";
export default function Navbar({ onCreatePost }) {
  const { user, signInWithGoogle, signOut } = useAuth();
  const [authError, setAuthError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showChatDropdown, setShowChatDropdown] = useState(false);
  const [activeChatPartner, setActiveChatPartner] = useState(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const loadNotifications = useCallback(async () => {
    if (!user.id) return;
    try {
      const notifs = await fetchNotifications(user.id);
      setNotifications(notifs);
    } catch (_) {}
  }, [user.id]);
  const loadConversations = useCallback(async () => {
    if (!user.id) return;
    try {
      const convs = await fetchUserConversations(user.id);
      const unread = convs.filter((c) => c.unread).length;
      setUnreadChatCount(unread);
    } catch (_) {}
  }, [user.id]);
  useEffect(() => {
    if (user.id) {
      loadNotifications();
      loadConversations();
      const notifChannel = supabase
        .channel(`notifs_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe();
      const chatChannel = supabase
        .channel(`chats_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${user.id}`,
          },
          () => {
            loadConversations();
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(notifChannel);
        supabase.removeChannel(chatChannel);
      };
    }
  }, [user.id, loadNotifications, loadConversations]);
  useEffect(() => {
    function handleClickOutside(e) {
      if (!e.target.closest(".navbar-icon-actions")) {
        setShowNotifDropdown(false);
        setShowChatDropdown(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);
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
  const unreadNotifCount = notifications.filter((n) => !n.read).length;
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" title="UniFind - Campus Lost &amp; Found">
          <div className="brand-logo-badge">
            <img src="/logo.png" alt="UniFind Logo" className="brand-logo-img" />
          </div>
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
          {user.isAuthenticated && (
            <div className="navbar-icon-actions" style={{ display: "flex", gap: "8px", position: "relative" }}>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className={`nav-icon-btn ${showChatDropdown ? "nav-icon-btn--active" : ""}`}
                  onClick={() => {
                    setShowChatDropdown((prev) => !prev);
                    setShowNotifDropdown(false);
                  }}
                  title="Direct Messages"
                >
                  <span>💬</span>
                  {unreadChatCount > 0 && (
                    <span className="nav-badge">{unreadChatCount}</span>
                  )}
                </button>
                {showChatDropdown && (
                  <ConversationsDropdown
                    userId={user.id}
                    onClose={() => setShowChatDropdown(false)}
                    onOpenChat={(chatData) => {
                      setActiveChatPartner(chatData);
                      setShowChatDropdown(false);
                      loadConversations();
                    }}
                  />
                )}
              </div>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className={`nav-icon-btn ${showNotifDropdown ? "nav-icon-btn--active" : ""}`}
                  onClick={() => {
                    setShowNotifDropdown((prev) => !prev);
                    setShowChatDropdown(false);
                  }}
                  title="Notifications"
                >
                  <span>🔔</span>
                  {unreadNotifCount > 0 && (
                    <span className="nav-badge">{unreadNotifCount}</span>
                  )}
                </button>
                {showNotifDropdown && (
                  <NotificationDropdown
                    notifications={notifications}
                    userId={user.id}
                    onClose={() => setShowNotifDropdown(false)}
                    onRefresh={loadNotifications}
                    onOpenChat={(chatData) => {
                      setActiveChatPartner(chatData);
                      setShowNotifDropdown(false);
                    }}
                  />
                )}
              </div>
            </div>
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
      {activeChatPartner && (
        <ChatModal
          partnerId={activeChatPartner.partnerId}
          partnerName={activeChatPartner.partnerName}
          partnerAvatar={activeChatPartner.partnerAvatar}
          postId={activeChatPartner.postId}
          onClose={() => setActiveChatPartner(null)}
          onRead={loadConversations}
        />
      )}
    </header>
  );
}