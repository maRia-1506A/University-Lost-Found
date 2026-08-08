import React from "react";

const CATEGORIES = [
  "All",
  "Electronics",
  "Wallet / ID",
  "Books",
  "Keys",
  "Clothing",
  "Backpack / Bag",
  "Other",
];

const TABS = ["all", "lost", "found"];

export default function FilterBar({ type, category, q, onChange }) {
  const activeIndex = TABS.indexOf(type) === -1 ? 0 : TABS.indexOf(type);

  return (
    <div className="filter-bar">
      <div className="filter-header">
        <h2>Community feed</h2>
        <p>Browse all campus updates or narrow the stream by item type and category.</p>
      </div>
      <div className="filter-tabs" role="tablist">
        {/* Sliding pill indicator */}
        <span
          className={`tab-slider tab-slider--${TABS[activeIndex]}`}
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={type === t}
            className={`tab ${t !== "all" ? `${t}-tab` : ""} ${type === t ? "active" : ""}`}
            onClick={() => onChange({ type: t })}
          >
            {t === "all" ? "✦ All" : t === "lost" ? "🔴 Lost" : "🟢 Found"}
          </button>
        ))}
      </div>
      <div className="filter-controls">
        <input
          type="search"
          className="search-input"
          placeholder="Search items, locations..."
          value={q}
          onChange={(e) => onChange({ q: e.target.value })}
        />
        <select
          className="category-select"
          value={category}
          onChange={(e) => onChange({ category: e.target.value })}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c === "All" ? "" : c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
