const express = require("express");
const { readPosts, writePosts } = require("../storage");

const router = express.Router();

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── GET /api/posts ──────────────────────────────────────────────
router.get("/", (req, res) => {
  let posts = readPosts();

  const { type, q, category } = req.query;

  if (type === "lost" || type === "found") {
    posts = posts.filter((p) => p.type === type);
  }

  if (category) {
    posts = posts.filter(
      (p) => p.category && p.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (q) {
    const term = q.toLowerCase();
    posts = posts.filter((p) => {
      return (
        p.title.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.location.toLowerCase().includes(term) ||
        (p.contactName && p.contactName.toLowerCase().includes(term))
      );
    });
  }

  posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(posts);
});

// ── GET /api/posts/:id ──────────────────────────────────────────
router.get("/:id", (req, res) => {
  const posts = readPosts();
  const post = posts.find((p) => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }
  res.json(post);
});

// ── POST /api/posts ─────────────────────────────────────────────
router.post("/", (req, res) => {
  const {
    type,
    title,
    description,
    category,
    location,
    dateLost,
    contactName,
    contactMethod,
    image,
  } = req.body;

  if (!type || !["lost", "found"].includes(type)) {
    return res.status(400).json({ message: "Type must be 'lost' or 'found'" });
  }
  if (!title || !title.trim()) {
    return res.status(400).json({ message: "Title is required" });
  }
  if (!description || !description.trim()) {
    return res.status(400).json({ message: "Description is required" });
  }

  const post = {
    id: createId(),
    type,
    title: title.trim(),
    description: description.trim(),
    category: category || "Other",
    location: location || "",
    dateLost: dateLost || "",
    contactName: contactName || "",
    contactMethod: contactMethod || "",
    image: image || "",
    status: "open",
    likes: 0,
    likedBy: [],
    comments: [],
    createdAt: new Date().toISOString(),
  };

  const posts = readPosts();
  posts.push(post);
  writePosts(posts);

  res.status(201).json(post);
});

// ── PATCH /api/posts/:id/status ─────────────────────────────────
router.patch("/:id/status", (req, res) => {
  const posts = readPosts();
  const post = posts.find((p) => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  const { status } = req.body;
  if (!["open", "resolved"].includes(status)) {
    return res.status(400).json({ message: "Status must be 'open' or 'resolved'" });
  }

  post.status = status;
  writePosts(posts);
  res.json(post);
});

// ── DELETE /api/posts/:id ───────────────────────────────────────
router.delete("/:id", (req, res) => {
  let posts = readPosts();
  const exists = posts.some((p) => p.id === req.params.id);
  if (!exists) {
    return res.status(404).json({ message: "Post not found" });
  }
  posts = posts.filter((p) => p.id !== req.params.id);
  writePosts(posts);
  res.json({ message: "Post deleted" });
});

// ── POST /api/posts/:id/like ────────────────────────────────────
// Body: { userId: string }  — toggles like on/off per user
router.post("/:id/like", (req, res) => {
  const posts = readPosts();
  const post = posts.find((p) => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  if (!post.likedBy) post.likedBy = [];
  if (!post.likes) post.likes = 0;

  const alreadyLiked = post.likedBy.includes(userId);
  if (alreadyLiked) {
    post.likedBy = post.likedBy.filter((id) => id !== userId);
    post.likes = Math.max(0, post.likes - 1);
  } else {
    post.likedBy.push(userId);
    post.likes += 1;
  }

  writePosts(posts);
  res.json({ likes: post.likes, liked: !alreadyLiked });
});

// ── GET /api/posts/:id/comments ─────────────────────────────────
router.get("/:id/comments", (req, res) => {
  const posts = readPosts();
  const post = posts.find((p) => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }
  res.json(post.comments || []);
});

// ── POST /api/posts/:id/comments ────────────────────────────────
// Body: { text, authorName, authorInitials }
router.post("/:id/comments", (req, res) => {
  const posts = readPosts();
  const post = posts.find((p) => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  const { text, authorName, authorInitials } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ message: "Comment text is required" });
  }

  const comment = {
    id: createId(),
    text: text.trim(),
    authorName: authorName || "Anonymous",
    authorInitials: authorInitials || "AN",
    createdAt: new Date().toISOString(),
  };

  if (!post.comments) post.comments = [];
  post.comments.push(comment);
  writePosts(posts);

  res.status(201).json(comment);
});

module.exports = router;
