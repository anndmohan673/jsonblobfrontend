import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { blobsApi } from "../api/client";
import type { Blob, BlobHistoryEntry, BlobVersionCompareResult } from "../api/types";
import { DiffResults } from "../components/DiffResults";
import { HistoryPanel } from "../components/HistoryPanel";
import { JsonEditor, parseJsonObject } from "../components/JsonEditor";
import { useToast } from "../components/Toast";

function pretty(data: Record<string, unknown>) {
  return JSON.stringify(data, null, 2);
}

export function BlobPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();

  const [blob, setBlob] = useState<Blob | null>(null);
  const [history, setHistory] = useState<BlobHistoryEntry[]>([]);
  const [name, setName] = useState("");
  const [jsonText, setJsonText] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [fromVersion, setFromVersion] = useState<number | "">("");
  const [toVersion, setToVersion] = useState<number | "">("");
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<BlobVersionCompareResult | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [doc, hist] = await Promise.all([blobsApi.get(id), blobsApi.history(id)]);
      setBlob(doc);
      setName(doc.name);
      setJsonText(pretty(doc.data));
      setHistory(hist);
      setSelectedVersion(doc.version);
      setDirty(false);
      setJsonError(null);
      if (hist.length >= 2) {
        setFromVersion(hist[hist.length - 2]!.version);
        setToVersion(hist[hist.length - 1]!.version);
      } else if (hist.length === 1) {
        setFromVersion(hist[0]!.version);
        setToVersion(hist[0]!.version);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load blob");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const refreshHistory = useCallback(async () => {
    if (!id) return;
    setHistoryLoading(true);
    try {
      const hist = await blobsApi.history(id);
      setHistory(hist);
    } catch {
      /* non-fatal */
    } finally {
      setHistoryLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onNameChange = (value: string) => {
    setName(value);
    setDirty(true);
  };

  const onJsonChange = (value: string) => {
    setJsonText(value);
    setDirty(true);
    const { error } = parseJsonObject(value);
    setJsonError(error);
  };

  const handleSave = async (mode: "put" | "patch") => {
    if (!blob) return;
    const { data, error } = parseJsonObject(jsonText);
    if (!data) {
      setJsonError(error);
      return;
    }

    setSaving(true);
    try {
      const updated =
        mode === "put"
          ? await blobsApi.update(blob.id, { name: name.trim(), data })
          : await blobsApi.patch(blob.id, {
              name: name.trim() !== blob.name ? name.trim() : undefined,
              data,
            });

      setBlob(updated);
      setName(updated.name);
      setJsonText(pretty(updated.data));
      setSelectedVersion(updated.version);
      setDirty(false);
      setJsonError(null);
      push(mode === "put" ? "Saved (full replace)" : "Patched (deep merge)", "success");
      void refreshHistory();
    } catch (err) {
      push(err instanceof Error ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!blob) return;
    const ok = window.confirm(`Delete “${blob.name}”? This also removes history.`);
    if (!ok) return;

    try {
      await blobsApi.remove(blob.id);
      push("Blob deleted", "success");
      void navigate("/");
    } catch (err) {
      push(err instanceof Error ? err.message : "Delete failed", "error");
    }
  };

  const handleSelectHistory = (entry: BlobHistoryEntry) => {
    setSelectedVersion(entry.version);
    setName(entry.name);
    setJsonText(pretty(entry.data));
    setJsonError(null);
    const isCurrent = blob?.version === entry.version;
    setDirty(!isCurrent);
  };

  const openCompare = () => {
    setCompareOpen(true);
    setCompareResult(null);
  };

  const handleCompareVersions = async () => {
    if (!blob || fromVersion === "" || toVersion === "") return;
    setComparing(true);
    try {
      const res = await blobsApi.compareVersions(blob.id, fromVersion, toVersion);
      setCompareResult(res);
    } catch (err) {
      push(err instanceof Error ? err.message : "Compare failed", "error");
    } finally {
      setComparing(false);
    }
  };

  if (loading) {
    return (
      <div className="state-block">
        <p className="muted">Loading blob…</p>
      </div>
    );
  }

  if (loadError || !blob) {
    return (
      <div className="state-block state-block--error">
        <p>{loadError ?? "Blob not found"}</p>
        <Link to="/" className="btn btn--ghost">
          Back to list
        </Link>
      </div>
    );
  }

  const versions = history.map((e) => e.version);

  return (
    <div className="blob-page">
      <nav className="crumb">
        <Link to="/">All blobs</Link>
        <span aria-hidden>/</span>
        <span>{blob.key}</span>
      </nav>

      <div className="blob-layout">
        <section className="editor-pane">
          <header className="editor-head">
            <div className="editor-title-block">
              <input
                className="name-input"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                aria-label="Blob name"
              />
              <div className="editor-meta">
                <span className="version-chip">v{blob.version}</span>
                <code className="mono-pill">{blob.id}</code>
                <code className="mono-pill">{blob.key}</code>
                {dirty ? <span className="dirty-chip">unsaved</span> : null}
              </div>
            </div>

            <div className="editor-actions">
              <button
                type="button"
                className="btn btn--ghost"
                disabled={saving || !!jsonError}
                onClick={() => void handleSave("patch")}
                title="Deep-merge data into the stored object"
              >
                Patch
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={saving || !!jsonError || !name.trim()}
                onClick={() => void handleSave("put")}
                title="Replace name and data entirely"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={openCompare}
                disabled={history.length < 2}
                title="Compare two history versions"
              >
                Compare
              </button>
              <button type="button" className="btn btn--danger" onClick={() => void handleDelete()}>
                Delete
              </button>
            </div>
          </header>

          <JsonEditor value={jsonText} onChange={onJsonChange} error={jsonError} rows={22} />

          <p className="hint">
            <strong>Save</strong> replaces the whole document. <strong>Patch</strong> deep-merges{" "}
            <code>data</code>. <strong>Compare</strong> diffs two history versions. Selecting a
            history snapshot loads it into the editor — save to restore.
          </p>

          {compareOpen ? (
            <section className="version-compare">
              <div className="version-compare-head">
                <h2>Compare versions</h2>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Close compare"
                  onClick={() => setCompareOpen(false)}
                >
                  ×
                </button>
              </div>

              <div className="version-compare-controls">
                <label className="field">
                  <span className="field-label">From</span>
                  <select
                    className="text-input"
                    value={fromVersion}
                    onChange={(e) =>
                      setFromVersion(e.target.value === "" ? "" : Number(e.target.value))
                    }
                  >
                    <option value="" disabled>
                      Select version
                    </option>
                    {versions.map((v) => (
                      <option key={`from-${v}`} value={v}>
                        v{v}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span className="field-label">To</span>
                  <select
                    className="text-input"
                    value={toVersion}
                    onChange={(e) =>
                      setToVersion(e.target.value === "" ? "" : Number(e.target.value))
                    }
                  >
                    <option value="" disabled>
                      Select version
                    </option>
                    {versions.map((v) => (
                      <option key={`to-${v}`} value={v}>
                        v{v}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={comparing || fromVersion === "" || toVersion === ""}
                  onClick={() => void handleCompareVersions()}
                >
                  {comparing ? "Comparing…" : "Run compare"}
                </button>
              </div>

              <DiffResults
                result={compareResult}
                title="Version diff"
                meta={
                  compareResult
                    ? `v${compareResult.fromVersion} (${compareResult.fromName}) → v${compareResult.toVersion} (${compareResult.toName})`
                    : null
                }
              />
            </section>
          ) : null}
        </section>

        <HistoryPanel
          entries={history}
          loading={historyLoading}
          selectedVersion={selectedVersion}
          onSelect={handleSelectHistory}
          currentVersion={blob.version}
        />
      </div>
    </div>
  );
}
