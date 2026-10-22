"use client";
import { useEffect, useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { api } from "@/lib/client";
import { FormRecord } from "@/lib/model";

type Version = {
  version: number;
  title: string;
  questions: number;
  createdAt: string;
};
export default function FormHistory({
  form,
  busy,
  onRestore,
}: {
  form: FormRecord;
  busy: boolean;
  onRestore: (version: number) => Promise<void>;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Version | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api(`forms/${form.id}/versions`)
      .then((r) => {
        if (active) {
          setVersions(r.versions);
          setError("");
        }
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [form.id, form.version, reload]);
  return (
    <section className="form-history">
      <div className="editor-intro">
        <span className="section-kicker">PUBLISHING</span>
        <h3>
          <History size={20} /> Version history
        </h3>
        <p>
          Each publish saves a version. Restore a version to your draft, review
          it, then publish when ready.
        </p>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}{" "}
          <button className="text-btn" onClick={() => setReload((n) => n + 1)}>
            Retry
          </button>
        </p>
      )}
      {loading ? (
        <p role="status">Loading versions…</p>
      ) : !versions.length ? (
        <div className="completion-preview">
          <h4>No published versions yet</h4>
          <p>Your first version appears when you publish this form.</p>
        </div>
      ) : (
        <ol className="version-list">
          {versions.map((v) => (
            <li key={v.version}>
              <div>
                <strong>
                  Version {v.version}
                  {v.version === form.version && (
                    <span className="status-badge published">
                      Current published version
                    </span>
                  )}
                </strong>
                <p>
                  {v.title} · {v.questions} questions
                </p>
                <time dateTime={v.createdAt}>
                  {new Date(v.createdAt).toLocaleString()}
                </time>
              </div>
              <button
                className="btn"
                disabled={busy}
                onClick={() => setSelected(v)}
              >
                <RotateCcw size={15} /> Restore draft
              </button>
            </li>
          ))}
        </ol>
      )}
      {selected && (
        <div
          className="restore-confirmation"
          role="region"
          aria-label="Confirm version restoration"
        >
          <h4>Restore version {selected.version}?</h4>
          <p>
            Your current draft will be replaced. Your published form and
            existing responses stay as they are. Duplicate the form first if you
            want to keep a separate copy of this draft.
          </p>
          <div className="row">
            <button
              className="btn"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              Cancel
            </button>
            <button
              className="btn primary"
              disabled={busy}
              onClick={async () => {
                try {
                  await onRestore(selected.version);
                  setSelected(null);
                } catch {}
              }}
            >
              {busy ? "Restoring…" : "Restore to draft"}
            </button>
          </div>
        </div>
      )}
      {versions.length === 100 && (
        <p className="small">Showing the latest 100 published versions.</p>
      )}
    </section>
  );
}
