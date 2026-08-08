import React, { useCallback, useEffect, useState } from "react";
import FilterBar from "../components/FilterBar.jsx";
import PostCard from "../components/PostCard.jsx";
import PostForm from "../components/PostForm.jsx";
import { fetchPosts, createPost, fetchStats } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Feed({ composerSignal = 0 }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ type: "all", category: "", q: "" });
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [stats, setStats] = useState({
    totalLost: 0,
    totalFound: 0,
    openCases: 0,
    resolvedCases: 0,
  });

  const loadStats = useCallback(async () => {
    try {
      const s = await fetchStats();
      setStats(s);
    } catch {
      // Non-critical — silently ignore
    }
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchPosts(filters);
      setPosts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadStats();
    loadPosts();
  }, [loadStats, loadPosts]);

  useEffect(() => {
    if (composerSignal > 0) {
      setShowForm(true);
    }
  }, [composerSignal]);

  function handleFilterChange(change) {
    setFilters((prev) => ({ ...prev, ...change }));
  }

  async function handleCreatePost(data) {
    setSubmitting(true);
    try {
      await createPost(data, user);
      setShowForm(false);
      setFilters({ type: "all", category: "", q: "" });
      loadStats();
      loadPosts();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="feed">
      {/* ── Dashboard Page Header ── */}
      <header className="page-header">
        <div className="page-header-title">
          <span className="eyebrow">✦ Campus Overview</span>
          <h1>Campus Lost &amp; Found Dashboard</h1>
          <p className="subtitle">
            Track reported items, search campus listings, and post lost or found updates in real-time.
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Share a Post
          </button>
        </div>
      </header>

      {/* ── KPI Metric Cards ── */}
      <section className="kpi-stats-grid">
        <div className="kpi-card kpi-card--lost">
          <div className="kpi-icon">🔴</div>
          <div className="kpi-data">
            <span className="kpi-value">{stats.totalLost}</span>
            <span className="kpi-label">Lost Items</span>
          </div>
        </div>

        <div className="kpi-card kpi-card--found">
          <div className="kpi-icon">🩵</div>
          <div className="kpi-data">
            <span className="kpi-value">{stats.totalFound}</span>
            <span className="kpi-label">Found Items</span>
          </div>
        </div>

        <div className="kpi-card kpi-card--open">
          <div className="kpi-icon">📋</div>
          <div className="kpi-data">
            <span className="kpi-value">{stats.openCases}</span>
            <span className="kpi-label">Open Cases</span>
          </div>
        </div>

        <div className="kpi-card kpi-card--resolved">
          <div className="kpi-icon">✅</div>
          <div className="kpi-data">
            <span className="kpi-value">{stats.resolvedCases}</span>
            <span className="kpi-label">Resolved</span>
          </div>
        </div>
      </section>

      <div className="dashboard-layout">
        <section className="feed-column">
          <FilterBar
            type={filters.type}
            category={filters.category}
            q={filters.q}
            onChange={handleFilterChange}
          />

          {error && <p className="error-banner">{error}</p>}
          {loading && <p className="status-text">Loading posts...</p>}

          {!loading && !error && posts.length === 0 && (
            <div className="empty-state">
              <p className="empty-icon">&#128269;</p>
              <h3>No posts found</h3>
              <p>Try a different search, or be the first to post about an item.</p>
            </div>
          )}

          <div className="post-list">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      </div>

      {showForm && (
        <PostForm
          onClose={() => setShowForm(false)}
          onSubmit={handleCreatePost}
          submitting={submitting}
        />
      )}
    </div>
  );
}
