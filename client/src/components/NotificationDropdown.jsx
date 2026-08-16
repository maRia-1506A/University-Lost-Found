import React from "react";
import { Link } from "react-router-dom";
import { markNotificationRead, markAllNotificationsRead } from "../api.js";

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

export default function NotificationDropdown({
  notifications = [],
  userId,
  onClose,
  onRefresh,
  onOpenChat,
}) {
  async function handleNotificationClick(item) {
    if (!item.read) {
      await markNotificationRead(item.id);
      if (onRefresh) onRefresh();
    }
    onClose();
    if (item.type === "message" && onOpenChat) {
      onOpenChat({
        partnerId: item.actor_id,
        partnerName: item.actor_name,
        partnerAvatar: item.actor_avatar,
        postId: item.post_id,
      });
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead(userId);
    if (onRefresh) onRefresh();
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="notification-dropdown"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="notification-dropdown-header">
        <div>
          <h3>Notifications</h3>
          {unreadCount > 0 && (
            <span className="unread-badge-text">{unreadCount} new</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="mark-read-btn"
            onClick={handleMarkAllRead}
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="notification-dropdown-body">
        {notifications.length === 0 ? (
          <div className="notification-empty">
            <span style={{ fontSize: "1.8rem" }}>🔔</span>
            <p>No notifications yet</p>
          </div>
        ) : (
          <ul className="notification-list">
            {notifications.map((item) => (
              <li
                key={item.id}
                className={`notification-item ${
                  !item.read ? "notification-item--unread" : ""
                }`}
                onClick={() => handleNotificationClick(item)}
              >
                <div className="notification-avatar-col">
                  {item.actor_avatar ? (
                    <img
                      src={item.actor_avatar}
                      alt={item.actor_name}
                      className="notification-avatar"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="notification-avatar-placeholder">
                      {item.actor_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="notification-type-badge">
                    {item.type === "like"
                      ? "❤️"
                      : item.type === "comment"
                      ? "💬"
                      : "✉️"}
                  </span>
                </div>

                <div className="notification-content">
                  <p className="notification-text">
                    <strong>{item.actor_name}</strong>{" "}
                    {item.type === "like"
                      ? "liked your post"
                      : item.type === "comment"
                      ? "commented:"
                      : "sent you a message:"}{" "}
                    {item.content && (
                      <span className="notification-snippet">
                        "{item.content}"
                      </span>
                    )}
                  </p>
                  <span className="notification-time">
                    {timeAgo(item.created_at)}
                  </span>
                </div>

                {item.type === "message" ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "999px", flexShrink: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNotificationClick(item);
                    }}
                  >
                    Reply
                  </button>
                ) : item.post_id ? (
                  <Link
                    to={`/post/${item.post_id}`}
                    className="notification-post-link"
                    onClick={() => onClose()}
                  >
                    View
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
