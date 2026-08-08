import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toggleLike } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import CommentSection from "./CommentSection.jsx";

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

export default function PostCard({ post }) {
  const { user } = useAuth();

  const [likes, setLikes] = useState(post.likes || 0);
  const [liked, setLiked] = useState(post.liked || false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);

  async function handleLike(e) {
    e.preventDefault();
    if (likeBusy) return;
    setLikeBusy(true);

    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((prev) => (wasLiked ? prev - 1 : prev + 1));
    try {
      const result = await toggleLike(post.id, user.id);
      setLikes(result.likes);
      setLiked(result.liked);
    } catch {
      setLiked(wasLiked);
      setLikes((prev) => (wasLiked ? prev + 1 : prev - 1));
    } finally {
      setLikeBusy(false);
    }
  }

  function handleToggleComments(e) {
    e.preventDefault();
    setShowComments((prev) => !prev);
  }

  const authorDisplayName = post.authorName || post.contactName || "Campus User";

  return (
    <article className={`post-card post-card--${post.type}`}>
      {/* ── Card top border accent ── */}
      <div className={`post-card-accent post-card-accent--${post.type}`} />

      {/* ── Header ── */}
      <header className="post-card-header">
        <Link
          to={`/profile/${post.authorId || post.authorName}`}
          className="author-profile-link"
          title={`View ${authorDisplayName}'s profile`}
        >
          {post.authorAvatar ? (
            <img
              src={post.authorAvatar}
              alt={authorDisplayName}
              className="avatar-img clickable-avatar"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={`avatar avatar--${post.type} clickable-avatar`}>
              {authorDisplayName.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
        <div className="post-meta">
          <div className="post-meta-row">
            <span className={`type-badge type-badge--${post.type}`}>
              {post.type === "lost" ? "🔴 LOST" : "🟢 FOUND"}
            </span>
            <span className={`status-pill status-pill--${post.status}`}>
              {post.status === "resolved" ? "✓ Resolved" : "Open"}
            </span>
          </div>
          <span className="time">
            {authorDisplayName ? (
              <Link
                to={`/profile/${post.authorId || post.authorName}`}
                className="author-name-link"
              >
                {authorDisplayName}
              </Link>
            ) : null}
            {authorDisplayName ? " · " : ""}
            {timeAgo(post.createdAt)}
          </span>
        </div>
      </header>

      {/* ── Body ── */}
      <Link to={`/post/${post.id}`} className="post-card-body-link">
        <div className="post-card-body">
          <h3 className="post-title">{post.title}</h3>
          {post.image && (
            <img src={post.image} alt={post.title} className="post-image" />
          )}
          <p className="post-description">{post.description}</p>
        </div>
      </Link>

      {/* ── Meta chips ── */}
      <div className="post-card-chips">
        {post.category && <span className="chip">{post.category}</span>}
        {post.location && (
          <span className="chip chip--location">
            <span aria-hidden="true">📍</span> {post.location}
          </span>
        )}
      </div>

      {/* ── Action bar ── */}
      <footer className="post-card-footer">
        <button
          type="button"
          className={`action-btn ${liked ? "action-btn--liked" : ""}`}
          onClick={handleLike}
          aria-label={liked ? "Unlike post" : "Like post"}
        >
          <span className="action-btn-icon">{liked ? "❤️" : "🤍"}</span>
          <span>{likes}</span>
        </button>

        <button
          type="button"
          className={`action-btn ${showComments ? "action-btn--active" : ""}`}
          onClick={handleToggleComments}
          aria-expanded={showComments}
          aria-label="Toggle comments"
        >
          <span className="action-btn-icon">💬</span>
          <span>
            {commentCount} {commentCount === 1 ? "comment" : "comments"}
          </span>
        </button>

        <Link to={`/post/${post.id}`} className="action-btn action-btn--view">
          View details →
        </Link>
      </footer>

      {/* ── Inline comments ── */}
      {showComments && (
        <div className="comment-section-wrapper">
          <CommentSection
            postId={post.id}
            onCountChange={setCommentCount}
          />
        </div>
      )}
    </article>
  );
}
