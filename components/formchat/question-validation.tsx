"use client";
import { Question } from "@/lib/model";

export default function QuestionValidation({
  question: q,
  onChange,
}: {
  question: Question;
  onChange: (patch: Partial<Question>) => void;
}) {
  const rules = q.validation || {};
  const text = [
    "short text",
    "long text",
    "address",
    "phone",
    "email",
    "url",
  ].includes(q.type);
  if (
    !text &&
    !["number", "date", "rating", "multiple choice"].includes(q.type)
  )
    return null;
  const fields: {
    key: keyof typeof rules;
    label: string;
    type?: string;
    min?: number;
    max?: number;
  }[] = text
    ? [
        { key: "minLength", label: "Minimum characters", min: 0, max: 4000 },
        { key: "maxLength", label: "Maximum characters", min: 1, max: 4000 },
      ]
    : q.type === "number"
      ? [
          { key: "min", label: "Minimum value", min: -1e12, max: 1e12 },
          { key: "max", label: "Maximum value", min: -1e12, max: 1e12 },
        ]
      : q.type === "date"
        ? [
            { key: "minDate", label: "Earliest date", type: "date" },
            { key: "maxDate", label: "Latest date", type: "date" },
          ]
        : q.type === "multiple choice"
          ? [
              {
                key: "minSelections",
                label: "Minimum choices",
                min: 0,
                max: q.options.length,
              },
              {
                key: "maxSelections",
                label: "Maximum choices",
                min: 1,
                max: q.options.length,
              },
            ]
          : [];
  return (
    <details className="studio-advanced answer-rules">
      <summary>
        Answer validation{Object.keys(rules).length ? " · Custom rules" : ""}
      </summary>
      <p className="small">
        Optional answers can be left blank. These limits apply when an answer is
        provided and are checked before saving a response.
      </p>
      {q.type === "rating" ? (
        <label>
          Rating scale
          <select
            value={rules.ratingMax || 5}
            onChange={(e) =>
              onChange({
                validation: { ratingMax: Number(e.target.value) as 5 | 10 },
              })
            }
          >
            <option value={5}>1 to 5</option>
            <option value={10}>1 to 10</option>
          </select>
        </label>
      ) : (
        <div className="form-settings-grid">
          {fields.map((f) => (
            <label key={f.key}>
              {f.label}
              <input
                type={f.type || "number"}
                min={f.min}
                max={f.max}
                step={q.type === "number" ? "any" : 1}
                placeholder="No limit"
                value={rules[f.key] ?? ""}
                onChange={(e) => {
                  const next = { ...rules };
                  if (!e.target.value) delete next[f.key];
                  else
                    Object.assign(next, {
                      [f.key]:
                        f.type === "date"
                          ? e.target.value
                          : Number(e.target.value),
                    });
                  onChange({ validation: next });
                }}
              />
            </label>
          ))}
        </div>
      )}
      {!!Object.keys(rules).length && (
        <button
          type="button"
          className="text-btn"
          onClick={() => onChange({ validation: undefined })}
        >
          Reset answer rules
        </button>
      )}
    </details>
  );
}
