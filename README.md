# UniFind — Campus Lost & Found

A full-stack campus lost & found platform built with **React + Vite** (frontend) and **Node.js + Express** (backend).

## Features 

- 📋 **Scrollable feed** of all lost & found posts
- 🔴 **Lost** / 🟢 **Found** post types with color-coded badges
- ❤️ **Like posts** (per-user, persisted on server)
- 💬 **Comments** on every post — expandable inline on the feed, full view on detail page
- 🔍 **Filter by type** (All / Lost / Found) and **search** by keyword
- ✏️ **Post form** modal with image upload, category, location, contact info
- ✓ **Mark as Resolved / Reopen** on the detail page
- 💾 Data persisted to `server/data/posts.json` (no database required)

---

## Project Structure

```
University_Lost_&_Found/
├── client/          React + Vite frontend (port 5173)
└── server/          Node + Express backend (port 5000)
```

---

## Running the App

### 1 — Start the backend

Open a terminal in `server/`:

```bash
cd server
node server.js
```

Or with auto-reload on changes:

```bash
node --watch server.js
```

Expected output: `Lost & Found server running on http://localhost:5000`

### 2 — Start the frontend

Open a **second** terminal in `client/`:

```bash
cd client
npm run dev
```

Then open **http://localhost:5173** in your browser.

> The Vite dev server automatically proxies `/api` requests to `http://localhost:5000` — no CORS issues.

---

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/posts?type=&q=&category=` | List posts (filterable) |
| GET | `/api/posts/:id` | Get single post |
| POST | `/api/posts` | Create post |
| PATCH | `/api/posts/:id/status` | Update open/resolved status |
| DELETE | `/api/posts/:id` | Delete post |
| POST | `/api/posts/:id/like` | Toggle like (body: `{ userId }`) |
| GET | `/api/posts/:id/comments` | Get comments |
| POST | `/api/posts/:id/comments` | Add comment (body: `{ text, authorName, authorInitials }`) |