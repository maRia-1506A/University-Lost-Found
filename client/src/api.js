import { supabase } from "./supabase.js";

// ── Helpers ─────────────────────────────────────────────────────

function handleError(error) {
  if (error) throw new Error(error.message || "Supabase error");
}

// ── Posts ────────────────────────────────────────────────────────

/**
 * Fetch all posts with their like_count and comment_count.
 * Supports filtering by type, category, and free-text search (q).
 * Excludes 'resolved' posts so resolved items disappear from the dashboard feed.
 */
export async function fetchPosts(params = {}) {
  let query = supabase
    .from("posts_with_counts")
    .select("*")
    .neq("status", "resolved")
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
 * Claim a post (mark as claimed by claimant).
 */
export async function claimPost(postId, user) {
  if (!user?.id) throw new Error("User must be authenticated");
  const payload = {
    claimer_id: user.id,
    claimer_name: user.name || "Campus Member",
    status: "claimed",
  };
  const { data, error } = await supabase
    .from("posts")
    .update(payload)
    .eq("id", postId)
    .select()
    .single();
  handleError(error);

  if (data && data.author_id && data.author_id !== user.id) {
    try {
      await sendNotification({
        userId: data.author_id,
        actorId: user.id,
        actorName: user.name || "Campus Member",
        actorAvatar: user.avatar || "",
        type: "claim",
        postId: data.id,
        postTitle: data.title,
        content: `claimed your post "${data.title}"`,
      });
    } catch (_) {}
  }

  return normalizePost(data);
}

/**
 * Unclaim a post (claimer cancels claim, resets status to open).
 */
export async function unclaimPost(postId, user) {
  if (!user?.id) throw new Error("User must be authenticated");
  const payload = {
    claimer_id: null,
    claimer_name: null,
    status: "open",
  };
  const { data, error } = await supabase
    .from("posts")
    .update(payload)
    .eq("id", postId)
    .eq("claimer_id", user.id)
    .select()
    .single();
  handleError(error);
  return normalizePost(data);
}

/**
 * Resolve a claimed or open post (author confirms resolved).
 */
export async function resolvePost(postId, user) {
  if (!user?.id) throw new Error("User must be authenticated");
  const payload = {
    status: "resolved",
  };
  const { data, error } = await supabase
    .from("posts")
    .update(payload)
    .eq("id", postId)
    .select()
    .single();
  handleError(error);
  return normalizePost(data);
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
    author_id: user?.isAuthenticated ? user.id : null,
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
export async function toggleLike(postId, userId, user = null) {
  if (!userId) return { likes: 0, liked: false };
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

    // Send notification to post author
    try {
      const { data: targetPost } = await supabase
        .from("posts")
        .select("author_id, title")
        .eq("id", postId)
        .single();

      if (targetPost && targetPost.author_id && targetPost.author_id !== userId) {
        await sendNotification({
          userId: targetPost.author_id,
          actorId: userId,
          actorName: user?.name || "Someone",
          actorAvatar: user?.avatar || "",
          type: "like",
          postId,
          postTitle: targetPost.title,
          content: "liked your post",
        });
      }
    } catch (_) {}
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

  // Send notification to post author
  try {
    const { data: targetPost } = await supabase
      .from("posts")
      .select("author_id, title")
      .eq("id", postId)
      .single();

    if (targetPost && targetPost.author_id && targetPost.author_id !== userId) {
      await sendNotification({
        userId: targetPost.author_id,
        actorId: userId,
        actorName: authorName || "Someone",
        actorAvatar: authorAvatar || "",
        type: "comment",
        postId,
        postTitle: targetPost.title,
        content: text.trim(),
      });
    }
  } catch (_) {}

  return normalizeComment(data);
}

// ── Notifications API ─────────────────────────────────────────────

export async function fetchNotifications(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return [];
  return data || [];
}

export async function markNotificationRead(notificationId) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
  return !error;
}

export async function markAllNotificationsRead(userId) {
  if (!userId) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  return !error;
}

export async function sendNotification({ userId, actorId, actorName, actorAvatar, type, postId, postTitle, content }) {
  if (!userId || userId === actorId) return; // Don't notify self
  await supabase.from("notifications").insert({
    user_id: userId,
    actor_id: actorId || "anonymous",
    actor_name: actorName || "Someone",
    actor_avatar: actorAvatar || "",
    type,
    post_id: postId || null,
    post_title: postTitle || "Post",
    content: content || "",
  });
}

// ── Messages / Chat API ──────────────────────────────────────────

export async function fetchUserConversations(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  // Pre-collect partner details from messages sent BY partners
  const partnerInfoMap = new Map();
  for (const msg of data) {
    if (msg.sender_id && msg.sender_id !== userId) {
      if (!partnerInfoMap.has(msg.sender_id)) {
        partnerInfoMap.set(msg.sender_id, {
          name: msg.sender_name || "Campus Member",
          avatar: msg.sender_avatar || "",
        });
      }
    }
  }

  // Group messages by conversation partner
  const convMap = new Map();
  for (const msg of data) {
    const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
    if (!partnerId) continue;

    if (!convMap.has(partnerId)) {
      const knownPartner = partnerInfoMap.get(partnerId);
      const partnerName = knownPartner
        ? knownPartner.name
        : msg.sender_id !== userId
        ? msg.sender_name || "Campus Member"
        : "Campus Member";

      const partnerAvatar = knownPartner
        ? knownPartner.avatar
        : msg.sender_id !== userId
        ? msg.sender_avatar || ""
        : "";

      convMap.set(partnerId, {
        partnerId,
        partnerName,
        partnerAvatar,
        postId: msg.post_id,
        lastMessage: msg.text,
        lastTime: msg.created_at,
        unread: msg.receiver_id === userId && !msg.read,
      });
    }
  }

  return Array.from(convMap.values());
}

export async function fetchDirectMessages(postId, userId1, userId2) {
  if (!userId1 || !userId2) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data;
}

/**
 * Mark all unread messages from a specific sender (partnerId) to the
 * current user (receiverId) as read. Called when the user opens a chat.
 */
export async function markMessagesRead(receiverId, senderId) {
  if (!receiverId || !senderId) return;
  await supabase
    .from("messages")
    .update({ read: true })
    .eq("receiver_id", receiverId)
    .eq("sender_id", senderId)
    .eq("read", false);
}

export async function sendChatMessage({ postId, receiverId, text, user }) {
  if (!receiverId || !text.trim()) throw new Error("Receiver and text required");

  // Generate a valid UUID for conversation_id to satisfy DB NOT NULL constraints
  const conversationId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "00000000-0000-4000-8000-000000000000";

  const payload = {
    post_id: postId || null,
    sender_id: user.id,
    sender_name: user.name || "Campus Member",
    sender_avatar: user.avatar || "",
    receiver_id: receiverId,
    text: text.trim(),
    conversation_id: conversationId,
  };

  let { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select()
    .single();

  // If conversation_id is not a column in this DB instance, retry without it
  if (error && error.message && error.message.includes("conversation_id")) {
    delete payload.conversation_id;
    const retry = await supabase
      .from("messages")
      .insert(payload)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  handleError(error);

  // Send notification to receiver
  try {
    await sendNotification({
      userId: receiverId,
      actorId: user.id,
      actorName: user.name || "Campus Member",
      actorAvatar: user.avatar || "",
      type: "message",
      postId,
      postTitle: "Chat Message",
      content: text.trim(),
    });
  } catch (_) {}

  return data;
}

// ── Stats ────────────────────────────────────────────────────────

export async function fetchStats() {
  const { data, error } = await supabase
    .from("posts")
    .select("type, status");
  handleError(error);

  return {
    totalLost: (data || []).filter((p) => p.type === "lost").length,
    totalFound: (data || []).filter((p) => p.type === "found").length,
    openCases: (data || []).filter((p) => p.status === "open").length,
    resolvedCases: (data || []).filter((p) => p.status === "resolved").length,
  };
}

// ── Profile API ──────────────────────────────────────────────────

/**
 * Fetch all posts created by a specific user (by author_id or user_id).
 */
export async function fetchUserPosts(userId) {
  if (!userId) return [];
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

  let query = supabase.from("posts_with_counts").select("*");

  if (isUuid) {
    query = query.eq("author_id", userId);
  } else {
    query = query.or(`contact_name.ilike.%${userId}%,author_name.ilike.%${userId}%`);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return (data || []).map(normalizePost);
}

/**
 * Fetch all comments written by a specific user.
 * Enriches with post title and post ID.
 */
export async function fetchUserComments(userId) {
  if (!userId) return [];
  const { data: comments, error } = await supabase
    .from("comments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !comments || comments.length === 0) return [];

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
  if (!userId) return [];
  const { data: likes, error } = await supabase
    .from("likes")
    .select("post_id")
    .eq("user_id", userId);

  if (error || !likes || likes.length === 0) return [];

  const postIds = likes.map((l) => l.post_id);
  const { data: posts, error: postsErr } = await supabase
    .from("posts_with_counts")
    .select("*")
    .in("id", postIds)
    .order("created_at", { ascending: false });

  if (postsErr) return [];
  return (posts || []).map(normalizePost);
}

/**
 * Fetch all posts claimed by a specific user.
 */
export async function fetchUserClaims(userId) {
  if (!userId) return [];
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

  let query = supabase.from("posts_with_counts").select("*");

  if (isUuid) {
    query = query.eq("claimer_id", userId);
  } else {
    query = query.ilike("claimer_name", `%${userId}%`);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(normalizePost);
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
    claimerId: row.claimer_id ?? null,
    claimerName: row.claimer_name ?? "",
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
