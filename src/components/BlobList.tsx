import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Blob } from "../api/types";

interface BlobListProps {
  blobs: Blob[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function BlobList({ blobs, loading, error, onRetry }: BlobListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return blobs;
    return blobs.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.key.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q),
    );
  }, [blobs, query]);

  if (loading) {
    return (
      <div className="state-block">
        <div className="skeleton-row" />
        <div className="skeleton-row" />
        <div className="skeleton-row" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-block state-block--error">
        <p>{error}</p>
        <button type="button" className="btn btn--ghost" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="blob-list-section">
      <div className="list-toolbar">
        <label className="sr-only" htmlFor="blob-search">
          Search blobs
        </label>
        <input
          id="blob-search"
          className="search-input"
          placeholder="Search by name, key, or id…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="list-count">
          {filtered.length} of {blobs.length}
        </span>
      </div>

      {blobs.length === 0 ? (
        <div className="empty-state">
          <h2>No blobs yet</h2>
          <p>Create your first JSON document to get started.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h2>No matches</h2>
          <p>Try a different search term.</p>
        </div>
      ) : (
        <ul className="blob-list">
          {filtered.map((blob, index) => (
            <li
              key={blob.id}
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              className="blob-list-item"
            >
              <Link to={`/blobs/${blob.id}`} className="blob-row">
                <div className="blob-row-main">
                  <span className="blob-name">{blob.name}</span>
                  <span className="blob-key">{blob.key}</span>
                </div>
                <div className="blob-row-meta">
                  <span className="version-chip">v{blob.version}</span>
                  <span className="blob-id">{blob.id}</span>
                  <span className="blob-time">{formatRelative(blob.updatedAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
