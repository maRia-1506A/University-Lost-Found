import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  fetchUserPosts,
  fetchUserComments,
  fetchUserLikedPosts,
} from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import PostCard from "../components/PostCard.jsx";

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

export default function ProfilePage() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();

  const isSelf = !userId || userId === "me" || userId === currentUser.id;
  const targetUserId = isSelf ? currentUser.id : userId;

  const [activeTab, setActiveTab] = useState("posts"); // 'posts' | 'comments' | 'likes'
  const [userPosts, setUserPosts] = useState([]);
  const [userComments, setUserComments] = useState([]);
  const [userLikedPosts, setUserLikedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileUser, setProfileUser] = useState(null);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    async function loadProfileData() {
      try {
        const [posts, comments, likedPosts] = await Promise.all([
          fetchUserPosts(targetUserId),
          fetchUserComments(targetUserId),
          fetchUserLikedPosts(targetUserId),
        ]);

        if (isCancelled) return;

        setUserPosts(posts);
        setUserComments(comments);
        setUserLikedPosts(likedPosts);

        if (isSelf) {
          setProfileUser(currentUser);
        } else {
          const samplePost = posts.find((p) => p.authorAvatar || p.authorName);
          const sampleComment = comments.find(
            (c) => c.authorAvatar || c.authorName
          );
          const name =
            samplePost?.authorName ||
            sampleComment?.authorName ||
            "Campus Member";
          const avatar =
            samplePost?.authorAvatar || sampleComment?.authorAvatar || null;
          setProfileUser({
            name,
            avatar,
            initials: name.substring(0, 2).toUpperCase(),
            isAuthenticated: !!avatar,
          });
        }
      } catch (err) {
        console.error("Error loading profile data:", err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadProfileData();

    return () => {
      isCancelled = true;
    };
  }, [targetUserId, isSelf, currentUser]);

  const displayUser =
    profileUser ||
    (isSelf ? currentUser : { name: "Campus User", initials: "CU" });

  return (
    <div className="profile-page">
      <Link to="/" className="back-link">
        ← Back to feed
      </Link>

      {/* ── User Profile Header Card ── */}
      <header className="profile-header-card">
        <div className="profile-header-accent">
          <div className="profile-cover-pattern" />
        </div>
        <div className="profile-header-main">
          <div className="profile-avatar-wrapper">
            {displayUser.avatar ? (
              <img
                src={displayUser.avatar}
                alt={displayUser.name}
                className="profile-avatar-img"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="profile-avatar-placeholder">
                {displayUser.initials || "CU"}
              </div>
            )}
            <span className="profile-status-online" title="Active Campus User" />
          </div>

          <div className="profile-user-details">
            <div className="profile-name-row">
              <h2>{displayUser.name}</h2>
              {displayUser.isAuthenticated && (
                <span className="verified-badge">
                  <svg className="google-icon-sm" viewBox="0 0 24 24">
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
                  Google Verified
                </span>
              )}
            </div>

            <div className="profile-meta-pills">
              {isSelf && currentUser.email && (
                <span className="meta-pill">
                  <span>✉️</span> {currentUser.email}
                </span>
              )}
              <span className="meta-pill">
                <span>🎓</span> Campus Contributor
              </span>
            </div>
          </div>
        </div>

        {/* ── Profile Quick Stats ── */}
        <div className="profile-stats-grid">
          <div
            className={`profile-stat-box ${
              activeTab === "posts" ? "active" : ""
            }`}
            onClick={() => setActiveTab("posts")}
          >
            <div className="stat-icon-badge stat-icon--posts">📝</div>
            <div className="stat-data">
              <span className="profile-stat-number">{userPosts.length}</span>
              <span className="profile-stat-label">Posts Created</span>
            </div>
          </div>

          <div
            className={`profile-stat-box ${
              activeTab === "comments" ? "active" : ""
            }`}
            onClick={() => setActiveTab("comments")}
          >
            <div className="stat-icon-badge stat-icon--comments">💬</div>
            <div className="stat-data">
              <span className="profile-stat-number">
                {userComments.length}
              </span>
              <span className="profile-stat-label">Comments</span>
            </div>
          </div>

          <div
            className={`profile-stat-box ${
              activeTab === "likes" ? "active" : ""
            }`}
            onClick={() => setActiveTab("likes")}
          >
            <div className="stat-icon-badge stat-icon--likes">❤️</div>
            <div className="stat-data">
              <span className="profile-stat-number">
                {userLikedPosts.length}
              </span>
              <span className="profile-stat-label">Liked Items</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab Content ── */}
      <div className="profile-tab-content">
        {loading ? (
          <p className="status-text">Loading activity...</p>
        ) : (
          <>
            {/* ── 1. Posts Tab ── */}
            {activeTab === "posts" && (
              <div className="post-list">
                {userPosts.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-icon">📝</p>
                    <h3>No posts created yet</h3>
                    <p>
                      {isSelf
                        ? "You haven't posted any lost or found items."
                        : `${displayUser.name} hasn't posted any items yet.`}
                    </p>
                  </div>
                ) : (
                  userPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))
                )}
              </div>
            )}

            {/* ── 2. Comments Tab ── */}
            {activeTab === "comments" && (
              <div className="profile-comments-list">
                {userComments.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-icon">💬</p>
                    <h3>No comments written yet</h3>
                    <p>
                      {isSelf
                        ? "You haven't commented on any posts yet."
                        : `${displayUser.name} hasn't commented on any posts yet.`}
                    </p>
                  </div>
                ) : (
                  userComments.map((c) => (
                    <div key={c.id} className="profile-comment-card">
                      <div className="profile-comment-header">
                        <span className="profile-comment-time">
                          Commented {timeAgo(c.createdAt)}
                        </span>
                        <Link
                          to={`/post/${c.postId}`}
                          className="profile-comment-post-link"
                        >
                          On post: <strong>"{c.postTitle}"</strong> →
                        </Link>
                      </div>
                      <p className="profile-comment-text">"{c.text}"</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── 3. Liked Items Tab ── */}
            {activeTab === "likes" && (
              <div className="post-list">
                {userLikedPosts.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-icon">❤️</p>
                    <h3>No liked items yet</h3>
                    <p>
                      {isSelf
                        ? "Posts you like will show up here."
                        : `${displayUser.name} hasn't liked any items yet.`}
                    </p>
                  </div>
                ) : (
                  userLikedPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
