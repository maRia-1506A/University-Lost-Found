import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const CATEGORIES = [
  "Electronics",
  "Wallet / ID",
  "Books",
  "Keys",
  "Clothing",
  "Backpack / Bag",
  "Other",
];

export default function PostForm({ onClose, onSubmit, submitting }) {
  const { user } = useAuth();
  const [type, setType] = useState("lost");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Other");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [dateLost, setDateLost] = useState("");
  const [contactName, setContactName] = useState(user?.name || "");
  const [contactMethod, setContactMethod] = useState(user?.email || "");
  const [image, setImage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [error, setError] = useState("");

  function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Please enter a title");
    if (!description.trim()) return setError("Please enter a description");

    onSubmit({
      type,
      title,
      category,
      description,
      location,
      dateLost,
      contactName: contactName.trim() || user?.name || "Anonymous",
      contactMethod: contactMethod.trim(),
      image,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>New Post</h2>
            <p className="modal-subtitle">Share a lost or found update with the campus community.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close composer">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="post-form">
          <div className="form-row type-toggle">
            <button
              type="button"
              className={`type-btn lost ${type === "lost" ? "active" : ""}`}
              onClick={() => setType("lost")}
            >
              I Lost Something
            </button>
            <button
              type="button"
              className={`type-btn found ${type === "found" ? "active" : ""}`}
              onClick={() => setType("found")}
            >
              I Found Something
            </button>
          </div>

          <label className="form-field">
            <span>Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === "lost" ? "e.g. Blue backpack with laptop" : "e.g. Found iPhone near the fountain"
              }
              maxLength="120"
            />
          </label>

          <div className="form-row two-col">
            <label className="form-field">
              <span>Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>{type === "lost" ? "Date lost" : "Date found"}</span>
              <input
                type="date"
                value={dateLost}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDateLost(e.target.value)}
              />
            </label>
          </div>

          <label className="form-field">
            <span>Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
              placeholder="Describe the item: brand, color, distinguishing marks, where it was..."
            />
          </label>

          <label className="form-field">
            <span>Location</span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Library, 2nd floor"
            />
          </label>

          <div className="form-row two-col">
            <label className="form-field">
              <span>Your name</span>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="How should people find you"
              />
            </label>
            <label className="form-field">
              <span>Contact</span>
              <input
                type="text"
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value)}
                placeholder="Email / phone"
              />
            </label>
          </div>

          <label className="form-field">
            <span>Photo (optional)</span>
            <input type="file" accept="image/*" onChange={handleFile} />
            {imagePreview && (
              <img src={imagePreview} alt="preview" className="image-preview" />
            )}
          </label>

          {error && <p className="form-error">{error}</p>}

          <p className="form-hint">Posts stay visible to everyone on campus until you mark them resolved.</p>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
