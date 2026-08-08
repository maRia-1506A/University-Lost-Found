import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchPost, updatePostStatus, deletePost, toggleLike } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import CommentSection from "../components/CommentSection.jsx";

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

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  // Like state — seeded from post.liked / post.likes after load
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Pass userId so fetchPost can check if this user already liked it
      const data = await fetchPost(id, user.id);
      setPost(data);
      setLikes(data.likes ?? 0);
      setLiked(data.liked ?? false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, user.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLike() {
    if (likeBusy) return;
    setLikeBusy(true);
    // Optimistic update
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((prev) => (wasLiked ? prev - 1 : prev + 1));
    try {
      const result = await toggleLike(id, user.id);
      setLikes(result.likes);
      setLiked(result.liked);
    } catch {
      // Rollback on error
      setLiked(wasLiked);
      setLikes((prev) => (wasLiked ? prev + 1 : prev - 1));
    } finally {
      setLikeBusy(false);
    }
  }

  async function handleResolve() {
    try {
      await updatePostStatus(id, post.status === "open" ? "resolved" : "open");
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this post permanently?")) return;
    try {
      await deletePost(id);
      navigate("/");
    } catch (err) {
      alert(err.message);
    }
  }

  async function copyToClipboard(text, successMsg) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(successMsg);
      window.setTimeout(() => setCopyMessage(""), 2200);
    } catch {
      alert("Copying is not available in this browser.");
    }
  }

  function handleCopyContact() {
    const contactText = [post.contactName, post.contactMethod]
      .filter(Boolean)
      .join(" · ");
    if (!contactText) {
      alert("No contact details listed for this post.");
      return;
    }
    copyToClipboard(contactText, "Contact details copied ✓");
  }

  function handleCopyLink() {
    copyToClipboard(window.location.href, "Link copied ✓");
  }

  if (loading) return <p className="status-text">Loading post…</p>;
  if (error) {
    return (
      <div className="detail-page empty-state">
        <p className="empty-icon">😕</p>
        <h3>Post not found</h3>
        <Link to="/" className="btn btn-primary">
          Back to feed
        </Link>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <Link to="/" className="back-link">
        ← Back to feed
      </Link>

      <article className="post-detail">
        {/* ── Type accent bar ── */}
        <div className={`post-detail-accent post-detail-accent--${post.type}`} />

        {/* ── Header ── */}
        <header className="post-detail-header">
          <span className={`type-badge type-badge--${post.type} type-badge--lg`}>
            {post.type === "lost" ? "🔴 LOST" : "🟢 FOUND"}
          </span>
          {post.status === "resolved" && (
            <span className="resolved-badge">✓ Resolved</span>
          )}
          <span className="time" style={{ marginLeft: "auto" }}>
            Posted {timeAgo(post.createdAt)}
          </span>
        </header>

        <h1 className="post-title post-title--detail">{post.title}</h1>

        {post.image && (
          <img
            src={post.image}
            alt={post.title}
            className="post-image post-image--detail"
          />
        )}

        <p className="post-description post-description--detail">
          {post.description}
        </p>

        {/* ── Detail grid ── */}
        <div className="detail-grid">
          {post.category && (
            <div className="detail-item">
              <span className="detail-label">Category</span>
              <span>{post.category}</span>
            </div>
          )}
          {post.location && (
            <div className="detail-item">
              <span className="detail-label">Location</span>
              <span>📍 {post.location}</span>
            </div>
          )}
          {post.dateLost && (
            <div className="detail-item">
              <span className="detail-label">
                {post.type === "lost" ? "Date lost" : "Date found"}
              </span>
              <span>
                {new Date(post.dateLost + "T00:00:00").toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="detail-item">
            <span className="detail-label">Status</span>
            <span className={`status-pill status-pill--${post.status}`}>
              {post.status === "resolved" ? "✓ Resolved" : "Open"}
            </span>
          </div>
        </div>

        {/* ── Like button ── */}
        <div className="detail-like-row">
          <button
            type="button"
            className={`action-btn action-btn--lg ${liked ? "action-btn--liked" : ""}`}
            onClick={handleLike}
            aria-label={liked ? "Unlike" : "Like this post"}
          >
            <span>{liked ? "❤️" : "🤍"}</span>
            <span>{likes} {likes === 1 ? "like" : "likes"}</span>
          </button>
        </div>

        {/* ── Contact box ── */}
        <div className="contact-box">
          <div className="contact-box-header">
            <div>
              <h3>
                {post.type === "lost"
                  ? "Someone may have found it"
                  : "Claim this item"}
              </h3>
              <p className="contact-helper">
                {post.type === "lost"
                  ? "Reach out if you spotted this item or have it with you."
                  : "Use the contact details below to claim it quickly."}
              </p>
            </div>
            <div className="detail-actions compact">
              <button
                className="btn btn-ghost"
                type="button"
                onClick={handleCopyContact}
              >
                Copy contact
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={handleCopyLink}
              >
                Share link
              </button>
            </div>
          </div>
          {post.contactName && (
            <p>
              <strong>Contact:</strong> {post.contactName}
            </p>
          )}
          {post.contactMethod && (
            <p>
              <strong>Details:</strong> {post.contactMethod}
            </p>
          )}
          {!post.contactName && !post.contactMethod && (
            <p>No contact info listed. Check back soon.</p>
          )}
          {copyMessage && <p className="copy-feedback">{copyMessage}</p>}
        </div>

        {/* ── Admin actions ── */}
        <div className="detail-actions">
          <button
            className={`btn ${
              post.status === "open" ? "btn-primary" : "btn-ghost"
            }`}
            type="button"
            onClick={handleResolve}
          >
            {post.status === "open" ? "Mark as resolved" : "Reopen post"}
          </button>
          <button className="btn btn-danger" type="button" onClick={handleDelete}>
            Delete post
          </button>
        </div>

        {/* ── Comments section ── */}
        <section className="detail-comments">
          <h2 className="detail-comments-title">
            💬 Comments
            {post.commentCount > 0 ? ` (${post.commentCount})` : ""}
          </h2>
          <CommentSection
            postId={post.id}
            userId={user.userId}
          />
        </section>
      </article>
    </div>
  );
}
