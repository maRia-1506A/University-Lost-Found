import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchPost, updatePostStatus, deletePost, toggleLike, claimPost, unclaimPost } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import CommentSection from "../components/CommentSection.jsx";
import AuthModal from "../components/AuthModal.jsx";
import ChatModal from "../components/ChatModal.jsx";

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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [actionCardStep, setActionCardStep] = useState("normal"); // 'normal' | 'confirm' | 'submitted'
  const [showChat, setShowChat] = useState(false);

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
    if (!user.isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
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

  const [claimBusy, setClaimBusy] = useState(false);

  function handleActionClick() {
    if (!user.isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setActionCardStep("confirm");
  }

  async function handleConfirmAction() {
    if (claimBusy) return;
    setClaimBusy(true);
    try {
      await claimPost(id, user);
      await load();
      setActionCardStep("submitted");
    } catch (err) {
      alert(err.message);
    } finally {
      setClaimBusy(false);
    }
  }

  async function handleUnclaim() {
    if (claimBusy) return;
    setClaimBusy(true);
    try {
      await unclaimPost(id, user);
      setActionCardStep("normal");
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setClaimBusy(false);
    }
  }

  async function handleResolve() {
    try {
      await updatePostStatus(id, post.status === "resolved" ? "open" : "resolved");
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

  const isOwner = !!(user.isAuthenticated && post.authorId && user.id === post.authorId);
  const isResolved = post.status === "resolved";
  const isClaimed = post.status === "claimed";
  const isClaimer = !!(user.id && post.claimerId && user.id === post.claimerId);

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
          {isClaimed && (
            <span className="claimed-badge">
              {post.type === "lost" ? "🔍 Found Reported" : "📦 Ownership Claimed"}
            </span>
          )}
          {isResolved && (
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

        {/* ── Status Banner ── */}
        {isClaimed && (
          <div className="claimed-banner">
            <span className="claimed-banner-icon">
              {post.type === "lost" ? "🔍" : "📦"}
            </span>
            <div>
              <strong>
                Item Status: {post.type === "lost" ? "Found Reported" : "Ownership Claimed"}
              </strong>
              <p>
                {post.type === "lost"
                  ? isOwner
                    ? `${post.claimerName || "A student"} reported finding your item! You can contact them below to arrange the return.`
                    : isClaimer
                    ? "You reported finding this item! Waiting for the poster to confirm return."
                    : `Reported found by ${post.claimerName || "another student"}. Awaiting poster confirmation.`
                  : isOwner
                    ? `${post.claimerName || "A student"} believes this item belongs to them! You can contact them below to verify and arrange the return.`
                    : isClaimer
                    ? "You claimed this item belongs to you! Waiting for the finder to verify."
                    : `Claimed by ${post.claimerName || "another student"}. Awaiting finder confirmation.`}
              </p>
            </div>
          </div>
        )}

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
              {isResolved
                ? "✓ Resolved"
                : isClaimed
                ? post.type === "lost"
                  ? "🔍 Found Reported"
                  : "📦 Ownership Claimed"
                : "Open"}
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

        {/* ── Unified Central Action Area ── */}
        <div className="contact-box">
          {isResolved ? (
            /* ── CASE 1: RESOLVED ── */
            <div className="action-card-resolved" style={{ textAlign: "center", padding: "0.75rem 0" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>✓</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-primary, #0f172a)" }}>
                Resolved
              </h3>
              <p style={{ color: "var(--text-secondary, #64748b)", fontSize: "0.9375rem", marginBottom: isOwner ? "1.25rem" : "0.5rem", lineHeight: "1.5", maxWidth: "420px", margin: "0 auto 1rem auto" }}>
                {post.type === "lost"
                  ? "This lost item has been found and the case is closed."
                  : "This found item has been returned to its owner and the case is closed."}
              </p>
              {isOwner && (
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", maxWidth: "340px", margin: "0 auto" }}>
                  <button className="btn btn-ghost" type="button" onClick={handleResolve}>
                    Reopen post
                  </button>
                  <button className="btn btn-danger" type="button" onClick={handleDelete}>
                    Delete post
                  </button>
                </div>
              )}
            </div>
          ) : isOwner ? (
            /* ── CASE 2: POST OWNER (OPEN or CLAIMED) ── */
            <>
              <div className="contact-box-header">
                <div>
                  <h3>
                    {post.type === "lost"
                      ? "Your Lost Item"
                      : "You posted this found item"}
                  </h3>
                  <p className="contact-helper">
                    {post.type === "lost"
                      ? "You posted this item as lost. Manage your post or confirm when it has been found and returned."
                      : "You reported finding this item. Manage your post or confirm when it has been handed over to its owner."}
                  </p>
                </div>
                <div className="detail-actions compact">
                  <button
                    className={`btn ${isClaimed || post.status === "open" ? "btn-primary" : "btn-ghost"}`}
                    type="button"
                    onClick={handleResolve}
                  >
                    {isClaimed
                      ? "✓ Confirm & Mark as Resolved"
                      : "Mark as resolved"}
                  </button>
                  <button className="btn btn-danger" type="button" onClick={handleDelete}>
                    Delete post
                  </button>
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
              {copyMessage && <p className="copy-feedback">{copyMessage}</p>}
            </>
          ) : actionCardStep === "confirm" ? (
            /* ── CASE 3a: OTHER USER - CONFIRM STEP ── */
            <div className="action-card-confirm" style={{ textAlign: "center", padding: "0.5rem 0" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
                {post.type === "lost" ? "🔍" : "📦"}
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-primary, #0f172a)" }}>
                {post.type === "lost" ? "Found this item?" : "Is this your item?"}
              </h3>
              <p style={{ color: "var(--text-secondary, #64748b)", fontSize: "0.9375rem", marginBottom: "1.25rem", lineHeight: "1.5", maxWidth: "420px", margin: "0 auto 1.25rem auto" }}>
                {post.type === "lost"
                  ? "If you found this item, let the owner know so you can arrange how to return it."
                  : "If you believe this item belongs to you, contact the person who found it to arrange verification and return."}
              </p>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", maxWidth: "340px", margin: "0 auto" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1 }}
                  onClick={() => setActionCardStep("normal")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={claimBusy}
                  onClick={handleConfirmAction}
                >
                  {claimBusy
                    ? "Submitting…"
                    : post.type === "lost"
                    ? "Yes, I Found It"
                    : "Yes, This Is My Item"}
                </button>
              </div>
            </div>
          ) : actionCardStep === "submitted" ? (
            /* ── CASE 3b: OTHER USER - SUBMITTED STEP ── */
            <div className="action-card-submitted" style={{ textAlign: "center", padding: "0.75rem 0" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>✓</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-primary, #0f172a)" }}>
                {post.type === "lost" ? "Thanks for reporting this!" : "Claim submitted!"}
              </h3>
              <p style={{ color: "var(--text-secondary, #64748b)", fontSize: "0.9375rem", marginBottom: "1.25rem", lineHeight: "1.5", maxWidth: "420px", margin: "0 auto 1.25rem auto" }}>
                {post.type === "lost"
                  ? "The poster has been notified that you found their item."
                  : "The finder has been notified that this item belongs to you."}
              </p>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", maxWidth: "340px", margin: "0 auto" }}>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => setShowChat(true)}
                >
                  {post.type === "lost" ? "Chat with Poster" : "Chat with Finder"}
                </button>
              </div>
            </div>
          ) : (
            /* ── CASE 3c: OTHER USER - NORMAL STEP ── */
            <>
              <div className="contact-box-header">
                <div>
                  <h3>
                    {post.type === "lost"
                      ? "Someone may have found it"
                      : "Owner verification & contact"}
                  </h3>
                  <p className="contact-helper">
                    {post.type === "lost"
                      ? "Reach out if you spotted this item or have it with you."
                      : "Contact the finder below to verify ownership and arrange return."}
                  </p>
                </div>
                <div className="detail-actions compact">
                  {post.status === "open" && (
                    <button
                      className="btn btn-claim"
                      type="button"
                      disabled={claimBusy}
                      onClick={handleActionClick}
                    >
                      {claimBusy
                        ? "Processing…"
                        : post.type === "lost"
                        ? "I Found This"
                        : "This Is My Item"}
                    </button>
                  )}
                  {isClaimer && isClaimed && (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      disabled={claimBusy}
                      onClick={handleUnclaim}
                    >
                      {claimBusy
                        ? "Cancelling…"
                        : post.type === "lost"
                        ? "Cancel report"
                        : "Cancel claim"}
                    </button>
                  )}
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => {
                      if (!user.isAuthenticated) {
                        setShowAuthModal(true);
                      } else {
                        setShowChat(true);
                      }
                    }}
                  >
                    {post.type === "lost" ? "Chat with Poster" : "Chat with Finder"}
                  </button>
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
            </>
          )}
        </div>

        {/* ── Comments section ── */}
        <section className="detail-comments">
          <h2 className="detail-comments-title">
            💬 Comments
            {post.commentCount > 0 ? ` (${post.commentCount})` : ""}
          </h2>
          <CommentSection
            postId={post.id}
            userId={user.id}
          />
        </section>
      </article>

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          message="Please sign in with Google to perform this action."
        />
      )}

      {showChat && post && (
        <ChatModal
          partnerId={post.authorId}
          partnerName={post.authorName || post.contactName || (post.type === "lost" ? "Poster" : "Finder")}
          partnerAvatar={post.authorAvatar || ""}
          postId={post.id}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
