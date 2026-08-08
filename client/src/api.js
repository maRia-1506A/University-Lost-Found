import { supabase } from "./supabase.js";

// ── Helpers ─────────────────────────────────────────────────────

function handleError(error) {
  if (error) throw new Error(error.message || "Supabase error");
}

// ── Posts ────────────────────────────────────────────────────────

/**
 * Fetch all posts with their like_count and comment_count.
 * Supports filtering by type, category, and free-text search (q).
 */
export async function fetchPosts(params = {}) {
  let query = supabase
    .from("posts_with_counts")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.type && params.type !== "all") {
    query = query.eq("type", params.type);
  }

  if (params.category) {
    query = query.ilike("category", params.category);
  }

  if (params.q) {
    const term = `%${params.q}%`;
    query = query.or(
      `title.ilike.${term},description.ilike.${term},location.ilike.${term},contact_name.ilike.${term}`
    );
  }

  const { data, error } = await query;
  handleError(error);
  return data.map(normalizePost);
}

/**
 * Fetch a single post by ID, including like_count and comment_count.
 * Also returns whether the given userId has liked it.
 */
export async function fetchPost(id, userId = null) {
  const { data, error } = await supabase
    .from("posts_with_counts")
    .select("*")
    .eq("id", id)
    .single();

  handleError(error);
  if (!data) throw new Error("Post not found");

  const post = normalizePost(data);

  if (userId) {
    const { data: likeRow } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", id)
      .eq("user_id", userId)
      .maybeSingle();
    post.liked = !!likeRow;
  } else {
    post.liked = false;
  }

  return post;
}

/**
 * Create a new post.
 */
export async function createPost(data, user = null) {
  const payload = {
    type: data.type,
    title: data.title.trim(),
    description: data.description.trim(),
    category: data.category || "Other",
    location: data.location || "",
    date_lost: data.dateLost || null,
    contact_name: data.contactName || (user ? user.name : ""),
    contact_method: data.contactMethod || "",
    image: data.image || "",
    status: "open",
    author_id: user?.id || null,
    author_name: user?.name || data.contactName || "Anonymous",
    author_avatar: user?.avatar || "",
  };

  const { data: row, error } = await supabase
    .from("posts")
    .insert(payload)
    .select()
    .single();

  handleError(error);
  return normalizePost(row);
}

/**
 * Toggle the status of a post between 'open' and 'resolved'.
 */
export async function updatePostStatus(id, status) {
  const { data, error } = await supabase
    .from("posts")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  handleError(error);
  return normalizePost(data);
}

/**
 * Permanently delete a post.
 */
export async function deletePost(id) {
  const { error } = await supabase.from("posts").delete().eq("id", id);
  handleError(error);
  return { message: "Post deleted" };
}

// ── Likes ────────────────────────────────────────────────────────

/**
 * Toggle a like for a post. Returns { likes: number, liked: boolean }.
 */
export async function toggleLike(postId, userId) {
  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    handleError(error);
  } else {
    const { error } = await supabase
      .from("likes")
      .insert({ post_id: postId, user_id: userId });
    handleError(error);
  }

  const { count, error: countErr } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);
  handleError(countErr);

  return { likes: count ?? 0, liked: !existing };
}

// ── Comments ─────────────────────────────────────────────────────

/**
 * Fetch all comments for a post, ordered oldest first.
 */
export async function fetchComments(postId) {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  handleError(error);
  return data.map(normalizeComment);
}

/**
 * Add a comment to a post.
 */
export async function addComment(postId, { text, authorName, authorInitials, authorAvatar, userId }) {
  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      user_id: userId || "anonymous",
      text: text.trim(),
      author_name: authorName || "Anonymous",
      author_initials: authorInitials || "AN",
      author_avatar: authorAvatar || "",
    })
    .select()
    .single();

  handleError(error);
  return normalizeComment(data);
}

// ── Stats ────────────────────────────────────────────────────────

export async function fetchStats() {
  const { data, error } = await supabase
    .from("posts")
    .select("type, status");
  handleError(error);

  return {
    totalLost: data.filter((p) => p.type === "lost").length,
    totalFound: data.filter((p) => p.type === "found").length,
    openCases: data.filter((p) => p.status === "open").length,
    resolvedCases: data.filter((p) => p.status === "resolved").length,
  };
}

// ── Profile API ──────────────────────────────────────────────────

/**
 * Fetch all posts created by a specific user (by author_id or user_id).
 */
export async function fetchUserPosts(userId) {
  const { data, error } = await supabase
    .from("posts_with_counts")
    .select("*")
    .or(`author_id.eq.${userId},contact_name.ilike.%${userId}%`)
    .order("created_at", { ascending: false });

  if (error) {
    // Fallback search if UUID type mismatch
    const { data: altData } = await supabase
      .from("posts_with_counts")
      .select("*")
      .order("created_at", { ascending: false });
    return (altData || [])
      .filter((p) => p.author_id === userId)
      .map(normalizePost);
  }

  return (data || []).map(normalizePost);
}

/**
 * Fetch all comments written by a specific user.
 * Enriches with post title and post ID.
 */
export async function fetchUserComments(userId) {
  const { data: comments, error } = await supabase
    .from("comments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  handleError(error);

  if (!comments || comments.length === 0) return [];

  // Fetch target post titles
  const postIds = [...new Set(comments.map((c) => c.post_id))];
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title")
    .in("id", postIds);

  const postMap = new Map((posts || []).map((p) => [p.id, p.title]));

  return comments.map((c) => ({
    ...normalizeComment(c),
    postTitle: postMap.get(c.post_id) || "View Post",
  }));
}

/**
 * Fetch all posts that a specific user has liked.
 */
export async function fetchUserLikedPosts(userId) {
  const { data: likes, error } = await supabase
    .from("likes")
    .select("post_id")
    .eq("user_id", userId);

  handleError(error);

  if (!likes || likes.length === 0) return [];

  const postIds = likes.map((l) => l.post_id);
  const { data: posts, error: postsErr } = await supabase
    .from("posts_with_counts")
    .select("*")
    .in("id", postIds)
    .order("created_at", { ascending: false });

  handleError(postsErr);
  return (posts || []).map(normalizePost);
}


// ── Normalization ────────────────────────────────────────────────

function normalizePost(row) {
  if (!row) return row;
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    category: row.category,
    location: row.location,
    dateLost: row.date_lost ?? "",
    contactName: row.contact_name ?? "",
    contactMethod: row.contact_method ?? "",
    image: row.image ?? "",
    status: row.status,
    createdAt: row.created_at,
    likes: row.like_count ?? 0,
    commentCount: row.comment_count ?? 0,
    liked: row.liked ?? false,
    authorId: row.author_id ?? null,
    authorName: row.author_name ?? row.contact_name ?? "",
    authorAvatar: row.author_avatar ?? "",
  };
}

function normalizeComment(row) {
  if (!row) return row;
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    text: row.text,
    authorName: row.author_name,
    authorInitials: row.author_initials,
    authorAvatar: row.author_avatar ?? "",
    createdAt: row.created_at,
  };
}
