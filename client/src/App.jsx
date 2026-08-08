import React, { useCallback, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Feed from "./pages/Feed.jsx";
import PostDetailPage from "./pages/PostDetailPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import Footer from "./components/Footer.jsx";

export default function App() {
  const [composerSignal, setComposerSignal] = useState(0);

  const handleCreatePost = useCallback(() => {
    setComposerSignal((value) => value + 1);
  }, []);

  return (
    <div className="app">
      <Navbar onCreatePost={handleCreatePost} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Feed composerSignal={composerSignal} />} />
          <Route path="/post/:id" element={<PostDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="*" element={<Feed composerSignal={composerSignal} />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
