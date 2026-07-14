import type { BlobHistoryEntry } from "../api/types";

interface HistoryPanelProps {
  entries: BlobHistoryEntry[];
  loading: boolean;
  selectedVersion: number | null;
  onSelect: (entry: BlobHistoryEntry) => void;
  currentVersion: number;
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function HistoryPanel({
  entries,
  loading,
  selectedVersion,
  onSelect,
  currentVersion,
}: HistoryPanelProps) {
  return (
    <aside className="history-panel">
      <div className="history-panel-head">
        <h2>Version history</h2>
        <p>Snapshots from every create and write.</p>
      </div>

      {loading ? (
        <p className="muted">Loading history…</p>
      ) : entries.length === 0 ? (
        <p className="muted">No history yet.</p>
      ) : (
        <ol className="history-list">
          {[...entries].reverse().map((entry) => {
            const active = selectedVersion === entry.version;
            const isCurrent = entry.version === currentVersion;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className={`history-item ${active ? "history-item--active" : ""}`}
                  onClick={() => onSelect(entry)}
                >
                  <span className="history-item-top">
                    <span className="version-chip">v{entry.version}</span>
                    {isCurrent ? <span className="current-chip">current</span> : null}
                  </span>
                  <span className="history-item-name">{entry.name}</span>
                  <span className="history-item-time">{formatTime(entry.createdAt)}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
