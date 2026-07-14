import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { blobsApi } from "../api/client";
import type { Blob } from "../api/types";
import { BlobList } from "../components/BlobList";
import { CreateBlobForm } from "../components/CreateBlobForm";

export function HomePage() {
  const [blobs, setBlobs] = useState<Blob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await blobsApi.list();
      setBlobs(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load blobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="home">
      <section className="home-hero">
        <p className="eyebrow">Versioned JSON documents</p>
        <h1 className="home-title">
          <span className="home-brand">JSON Blob</span>
        </h1>
        <p className="home-lead">
          Store, edit, and rewind JSON blobs — full replace or deep-merge patches,
          with a snapshot on every write.
        </p>
        <div className="hero-actions">
          <button type="button" className="btn btn--primary" onClick={() => setCreateOpen(true)}>
            New blob
          </button>
          <Link to="/compare" className="btn btn--ghost">
            Compare
          </Link>
          <button type="button" className="btn btn--ghost" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
        </div>
      </section>

      <BlobList blobs={blobs} loading={loading} error={error} onRetry={() => void load()} />

      <CreateBlobForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void load()}
      />
    </div>
  );
}
