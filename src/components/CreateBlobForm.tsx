import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { blobsApi } from "../api/client";
import { JsonEditor, parseJsonObject } from "./JsonEditor";
import { useToast } from "./Toast";

interface CreateBlobFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateBlobForm({ open, onClose, onCreated }: CreateBlobFormProps) {
  const navigate = useNavigate();
  const { push } = useToast();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [jsonText, setJsonText] = useState('{\n  "hello": "world"\n}');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setName("");
    setKey("");
    setJsonText('{\n  "hello": "world"\n}');
    setFormError(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Name is required");
      return;
    }

    const { data, error } = parseJsonObject(jsonText);
    if (!data) {
      setFormError(error ?? "Invalid JSON");
      return;
    }

    setSubmitting(true);
    try {
      const trimmedKey = key.trim();
      const created = await blobsApi.create({
        name: trimmedName,
        data,
        ...(trimmedKey ? { key: trimmedKey } : {}),
      });
      push(`Created “${trimmedName}”`, "success");
      onCreated();
      handleClose();
      void navigate(`/blobs/${created.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create blob");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-blob-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="create-blob-title">New blob</h2>
          <button type="button" className="icon-btn" onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="create-form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="field">
            <label className="field-label" htmlFor="blob-name">
              Name
            </label>
            <input
              id="blob-name"
              className="text-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="User Preferences"
              autoFocus
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="blob-key">
              Key <span className="optional">(optional)</span>
            </label>
            <input
              id="blob-key"
              className="text-input"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="auto from name if empty"
            />
          </div>

          <JsonEditor value={jsonText} onChange={setJsonText} rows={10} />

          {formError ? <p className="field-error">{formError}</p> : null}

          <div className="modal-actions">
            <button type="button" className="btn btn--ghost" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Creating…" : "Create blob"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
