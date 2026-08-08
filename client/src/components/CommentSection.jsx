import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { addComment, fetchComments } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function CommentSection({ postId, onCountChange }) {
  const { user } = useAuth();

  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchComments(postId)
      .then((data) => {
        if (!cancelled) {
          setComments(data);
          if (onCountChange) onCountChange(data.length);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [postId, onCountChange]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError("");
    try {
      const newComment = await addComment(postId, {
        text: trimmed,
        authorName: user.name,
        authorInitials: user.initials,
        authorAvatar: user.avatar || "",
        userId: user.id,
      });
      const updated = [...comments, newComment];
      setComments(updated);
      if (onCountChange) onCountChange(updated.length);
      setText("");
    } catch (err) {
      setError(err.message || "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="comment-section">
      {/* ── Comment list ── */}
      {comments.length === 0 ? (
        <p className="comment-empty">No comments yet — be the first!</p>
      ) : (
        <ul className="comment-list">
          {comments.map((c) => (
            <li key={c.id} className="comment-item">
              <Link to={`/profile/${c.userId}`} title={`View ${c.authorName}'s profile`}>
                {c.authorAvatar ? (
                  <img
                    src={c.authorAvatar}
                    alt={c.authorName}
                    className="comment-avatar-img clickable-avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="comment-avatar clickable-avatar">
                    {c.authorInitials || "?"}
                  </div>
                )}
              </Link>
              <div className="comment-body">
                <div className="comment-meta">
                  <Link
                    to={`/profile/${c.userId}`}
                    className="comment-author author-name-link"
                  >
                    {c.authorName}
                  </Link>
                  <span className="comment-time">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="comment-text">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ── New comment form ── */}
      <form className="comment-form" onSubmit={handleSubmit}>
        <div className="comment-input-row">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="comment-avatar-img"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="comment-avatar">{user.initials}</div>
          )}
          <input
            ref={inputRef}
            className="comment-input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              user.isAuthenticated
                ? `Comment as ${user.name}…`
                : "Write a comment…"
            }
            maxLength={500}
            disabled={submitting}
          />
          <button
            type="submit"
            className="comment-send-btn"
            disabled={submitting || !text.trim()}
            aria-label="Send comment"
          >
            {submitting ? "…" : "Send"}
          </button>
        </div>
        {error && <p className="comment-error">{error}</p>}
      </form>
    </div>
  );
}
