import React, { useEffect, useState } from "react";
import { fetchUserConversations } from "../api.js";
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 7 ? `${days}d ago` : new Date(dateStr).toLocaleDateString();
}
export default function ConversationsDropdown({
  userId,
  onClose,
  onOpenChat,
}) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetchUserConversations(userId)
      .then((data) => {
        if (active) {
          setConversations(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);
  function handleSelect(conv) {
    onClose();
    if (onOpenChat) {
      onOpenChat({
        partnerId: conv.partnerId,
        partnerName: conv.partnerName,
        partnerAvatar: conv.partnerAvatar,
        postId: conv.postId,
      });
    }
  }
  const unreadCount = conversations.filter((c) => c.unread).length;
  return (
    <div className="notification-dropdown messenger-chats-dropdown" onClick={(e) => e.stopPropagation()}>
      <div className="notification-dropdown-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 800 }}>Chats</h3>
          {unreadCount > 0 && (
            <span className="unread-badge-text">{unreadCount} unread</span>
          )}
        </div>
      </div>
      <div className="notification-dropdown-body">
        {loading ? (
          <div className="notification-empty">
            <p>Loading chats...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="notification-empty">
            <span style={{ fontSize: "2rem" }}>💬</span>
            <p style={{ marginTop: "6px", fontWeight: 700 }}>No active conversations</p>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
              Click "Chat with Poster" on any lost/found post to start messaging.
            </span>
          </div>
        ) : (
          <ul className="notification-list">
            {conversations.map((conv) => (
              <li
                key={conv.partnerId}
                className={`notification-item messenger-chat-item ${conv.unread ? "notification-item--unread" : ""}`}
                onClick={() => handleSelect(conv)}
              >
                <div className="notification-avatar-col">
                  {conv.partnerAvatar ? (
                    <img
                      src={conv.partnerAvatar}
                      alt={conv.partnerName}
                      className="notification-avatar"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="notification-avatar-placeholder">
                      {conv.partnerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="messenger-item-online-dot" />
                </div>
                <div className="notification-content">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "14px", color: "var(--text)" }}>{conv.partnerName}</strong>
                    <span className="notification-time">{timeAgo(conv.lastTime)}</span>
                  </div>
                  <p className="notification-snippet" style={{ fontStyle: "normal", fontSize: "13px", color: conv.unread ? "var(--text)" : "var(--text-muted)", fontWeight: conv.unread ? 700 : 400, marginTop: "2px" }}>
                    {conv.lastMessage}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}