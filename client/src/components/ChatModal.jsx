import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { fetchDirectMessages, sendChatMessage, markMessagesRead } from "../api.js";
import { supabase } from "../supabase.js";
import { useAuth } from "../context/AuthContext.jsx";
function formatMsgTime(dateStr) {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
export default function ChatModal({
  partnerId,
  partnerName = "Campus Member",
  partnerAvatar = "",
  postId = null,
  onClose,
  onRead,
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resolvedPartnerName, setResolvedPartnerName] = useState("");
  const [resolvedPartnerAvatar, setResolvedPartnerAvatar] = useState("");
  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDirectMessages(postId, user.id, partnerId)
      .then((data) => {
        if (!cancelled) {
          setMessages(data);
          const partnerMsg = data.find(
            (m) => m.sender_id !== user.id && m.sender_name
          );
          if (partnerMsg) {
            if (partnerMsg.sender_name) setResolvedPartnerName(partnerMsg.sender_name);
            if (partnerMsg.sender_avatar) setResolvedPartnerAvatar(partnerMsg.sender_avatar);
          }
          setLoading(false);
          const hasUnread = data.some(
            (m) => m.sender_id === partnerId && m.receiver_id === user.id && !m.read
          );
          if (hasUnread) {
            markMessagesRead(user.id, partnerId).then(() => {
              if (onRead) onRead();
            });
          }
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId, user.id, partnerId, onRead]);
  useEffect(() => {
    const channel = supabase
      .channel(`chat_${user.id}_${partnerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new;
          if (
            (newMsg.sender_id === user.id && newMsg.receiver_id === partnerId) ||
            (newMsg.sender_id === partnerId && newMsg.receiver_id === user.id)
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            if (newMsg.sender_id !== user.id && newMsg.sender_name) {
              setResolvedPartnerName(newMsg.sender_name);
              if (newMsg.sender_avatar) setResolvedPartnerAvatar(newMsg.sender_avatar);
              markMessagesRead(user.id, partnerId).then(() => {
                if (onRead) onRead();
              });
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, partnerId]);
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);
  useEffect(() => {
    if (!loading) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [loading]);
  const displayPartnerName =
    resolvedPartnerName ||
    (partnerName && partnerName !== user.name ? partnerName : "Campus Member");
  const displayPartnerAvatar = resolvedPartnerAvatar || partnerAvatar || "";
  async function handleSend(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const sent = await sendChatMessage({
        postId,
        receiverId: partnerId,
        text: trimmed,
        user,
      });
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
      setText("");
    } catch (err) {
      alert(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }
  const modalContent = (
    <div
      className="chat-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Chat with ${displayPartnerName}`}
    >
      <div
        className="chat-modal-window"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="chat-modal-header">
          <div className="chat-modal-user-info">
            <div className="chat-modal-avatar-wrap">
              {displayPartnerAvatar ? (
                <img
                  src={displayPartnerAvatar}
                  alt={displayPartnerName}
                  className="chat-modal-avatar-img"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="chat-modal-avatar-placeholder">
                  {displayPartnerName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="chat-modal-online-dot" title="Active now" />
            </div>
            <div className="chat-modal-user-text">
              <h3 className="chat-modal-partner-name">{displayPartnerName}</h3>
              <span className="chat-modal-subtitle">
                <span className="chat-modal-subtitle-dot" />
                Active now · Direct Message
              </span>
            </div>
          </div>
          <button
            type="button"
            className="chat-modal-close-btn"
            onClick={onClose}
            aria-label="Close chat"
          >
            ✕
          </button>
        </div>
        <div className="chat-modal-body">
          {loading ? (
            <div className="chat-modal-loading">
              <div className="chat-modal-spinner" />
              <span>Loading messages…</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-modal-empty">
              <div className="chat-modal-empty-icon">💬</div>
              <h4>Say hello to {displayPartnerName}!</h4>
              <p>Start a conversation about this item.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user.id;
              const senderName = isMine
                ? user.name
                : msg.sender_name || displayPartnerName;
              const avatarSrc = isMine
                ? user.avatar
                : msg.sender_avatar || displayPartnerAvatar;
              return (
                <div
                  key={msg.id}
                  className={`chat-msg-row ${isMine ? "chat-msg-row--mine" : "chat-msg-row--theirs"}`}
                >
                  {!isMine && (
                    <div className="chat-msg-avatar">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt={senderName} referrerPolicy="no-referrer" />
                      ) : (
                        <span>{senderName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  )}
                  <div className="chat-msg-content">
                    {!isMine && (
                      <span className="chat-msg-sender-name">{senderName}</span>
                    )}
                    <div className="chat-msg-bubble">
                      <p>{msg.text}</p>
                    </div>
                    <span className="chat-msg-time">{formatMsgTime(msg.created_at)}</span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatBottomRef} />
        </div>
        <form className="chat-modal-footer" onSubmit={handleSend}>
          <input
            ref={inputRef}
            type="text"
            className="chat-modal-input"
            placeholder="Write a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <button
            type="submit"
            className="chat-modal-send-btn"
            disabled={sending || !text.trim()}
            title="Send"
          >
            {sending ? (
              <div className="chat-send-spinner" />
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
  return ReactDOM.createPortal(modalContent, document.body);
}