import { useId } from "react";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  rows?: number;
  label?: string;
}

export function JsonEditor({
  value,
  onChange,
  error,
  rows = 18,
  label = "JSON data",
}: JsonEditorProps) {
  const id = useId();

  return (
    <div className={`json-editor ${error ? "json-editor--invalid" : ""}`}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="json-editor-input"
        spellCheck={false}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            e.preventDefault();
            const el = e.currentTarget;
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const next = value.slice(0, start) + "  " + value.slice(end);
            onChange(next);
            requestAnimationFrame(() => {
              el.selectionStart = el.selectionEnd = start + 2;
            });
          }
        }}
      />
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

export function parseJsonObject(text: string): {
  data: Record<string, unknown> | null;
  error: string | null;
} {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { data: null, error: "Top-level value must be a JSON object ({})" };
    }
    return { data: parsed as Record<string, unknown>, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Invalid JSON",
    };
  }
}

export function parseJsonValue(text: string): {
  value: unknown | null;
  error: string | null;
} {
  try {
    return { value: JSON.parse(text) as unknown, error: null };
  } catch (err) {
    return {
      value: null,
      error: err instanceof Error ? err.message : "Invalid JSON",
    };
  }
}
