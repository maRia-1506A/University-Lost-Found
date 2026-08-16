# UniFind — Campus Lost & Found

A modern campus lost & found web application built with **React + Vite** and **Supabase** (Database, Authentication & Realtime data).

## Features 

- 📋 **Interactive Feed**: Browse lost and found items in real-time.
- 🔴 **Lost** / 🟢 **Found**: Clear visual badges and status indicators.
- 🔐 **Google Authentication**: Sign in with Google via Supabase OAuth or use instant anonymous mode.
- ❤️ **Likes & Comments**: Like posts and comment inline on the feed or on detail pages.
- 🔍 **Filtering & Search**: Filter by category, status, type (Lost/Found), or keywords.
- 👤 **User Profiles**: Track your reported posts, comments, and saved/liked items.

---

## Setup & Environment Setup

### 1 — Supabase Database Setup

1. Create a project on [Supabase](https://supabase.com/).
2. Run the SQL statements in [`supabase/schema.sql`](file:///e:/CODE/University%20Lost%20%26%20Found/supabase/schema.sql) inside your **Supabase Dashboard → SQL Editor**.
3. Create `client/.env.local` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1... (Your Anon Public Key)
```

### 2 — Google Authentication Setup (Optional)

1. Enable Google OAuth under **Supabase Dashboard → Authentication → Providers → Google**.
2. Add `http://localhost:5173` to **Supabase Dashboard → Authentication → Redirect URLs**.

---

## Running the App Locally

Open a terminal in the project directory:

```bash
cd client
npm run dev
```

Then open **http://localhost:5173** in your browser.