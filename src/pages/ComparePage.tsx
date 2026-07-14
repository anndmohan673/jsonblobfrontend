import { useState } from "react";
import { Link } from "react-router-dom";
import { blobsApi } from "../api/client";
import type { JsonCompareResult } from "../api/types";
import { DiffResults } from "../components/DiffResults";
import { JsonEditor, parseJsonValue } from "../components/JsonEditor";
import { useToast } from "../components/Toast";

const DEFAULT_LEFT = `{
  "theme": "dark",
  "language": "en"
}`;

const DEFAULT_RIGHT = `{
  "theme": "light",
  "language": "en",
  "notifications": true
}`;

export function ComparePage() {
  const { push } = useToast();
  const [leftText, setLeftText] = useState(DEFAULT_LEFT);
  const [rightText, setRightText] = useState(DEFAULT_RIGHT);
  const [leftError, setLeftError] = useState<string | null>(null);
  const [rightError, setRightError] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<JsonCompareResult | null>(null);

  const onLeftChange = (value: string) => {
    setLeftText(value);
    setLeftError(parseJsonValue(value).error);
  };

  const onRightChange = (value: string) => {
    setRightText(value);
    setRightError(parseJsonValue(value).error);
  };

  const handleCompare = async () => {
    const left = parseJsonValue(leftText);
    const right = parseJsonValue(rightText);
    setLeftError(left.error);
    setRightError(right.error);
    if (left.error || right.error) return;

    setComparing(true);
    try {
      const res = await blobsApi.compare(left.value, right.value);
      setResult(res);
    } catch (err) {
      push(err instanceof Error ? err.message : "Compare failed", "error");
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="compare-page">
      <nav className="crumb">
        <Link to="/">All blobs</Link>
        <span aria-hidden>/</span>
        <span>Compare</span>
      </nav>

      <header className="compare-hero">
        <h1 className="compare-title">Compare JSON</h1>
        <p className="compare-lead">
          Paste any two JSON values and diff them. Paths use dotted keys and{" "}
          <code>[index]</code> for arrays.
        </p>
        <button
          type="button"
          className="btn btn--primary"
          disabled={comparing || !!leftError || !!rightError}
          onClick={() => void handleCompare()}
        >
          {comparing ? "Comparing…" : "Compare"}
        </button>
      </header>

      <div className="compare-editors">
        <JsonEditor
          label="Left"
          value={leftText}
          onChange={onLeftChange}
          error={leftError}
          rows={16}
        />
        <JsonEditor
          label="Right"
          value={rightText}
          onChange={onRightChange}
          error={rightError}
          rows={16}
        />
      </div>

      <DiffResults result={result} title="Result" />
    </div>
  );
}
