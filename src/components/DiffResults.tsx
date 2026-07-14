import type { JsonCompareResult, JsonDiffChange } from "../api/types";

function formatValue(value: unknown) {
  if (typeof value === "string") return JSON.stringify(value);
  return JSON.stringify(value, null, 2);
}

function ChangeRow({ change }: { change: JsonDiffChange }) {
  return (
    <li className={`diff-change diff-change--${change.type}`}>
      <div className="diff-change-head">
        <span className={`diff-type diff-type--${change.type}`}>{change.type}</span>
        <code className="diff-path">{change.path || "(root)"}</code>
      </div>
      {change.type === "added" ? (
        <pre className="diff-value diff-value--to">{formatValue(change.to)}</pre>
      ) : null}
      {change.type === "removed" ? (
        <pre className="diff-value diff-value--from">{formatValue(change.from)}</pre>
      ) : null}
      {change.type === "changed" ? (
        <div className="diff-value-pair">
          <pre className="diff-value diff-value--from">{formatValue(change.from)}</pre>
          <span className="diff-arrow" aria-hidden>
            →
          </span>
          <pre className="diff-value diff-value--to">{formatValue(change.to)}</pre>
        </div>
      ) : null}
    </li>
  );
}

interface DiffResultsProps {
  result: JsonCompareResult | null;
  title?: string;
  meta?: string | null;
}

export function DiffResults({ result, title = "Diff", meta }: DiffResultsProps) {
  if (!result) return null;

  return (
    <section className="diff-results">
      <div className="diff-results-head">
        <h2>{title}</h2>
        {meta ? <p className="muted">{meta}</p> : null}
        <p className={`diff-equal ${result.equal ? "diff-equal--yes" : "diff-equal--no"}`}>
          {result.equal ? "Identical" : `${result.changes.length} change${result.changes.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {result.equal ? (
        <p className="muted">No differences found.</p>
      ) : (
        <ol className="diff-list">
          {result.changes.map((change) => (
            <ChangeRow key={`${change.type}:${change.path}`} change={change} />
          ))}
        </ol>
      )}
    </section>
  );
}
