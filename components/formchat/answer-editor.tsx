"use client";
import NextImage from "next/image";
import { useState } from "react";
import { ImagePlus, Plus, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { parseBulkChoices } from "@/lib/form-authoring";
import { Modal } from "./ui";
import { Question } from "@/lib/model";
import { upload } from "@/lib/client";
function ChoiceImage({
  src,
  fit,
  label,
  onChange,
}: {
  src: string;
  fit: "cover" | "contain";
  label: string;
  onChange: (src: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="choice-image-upload">
      <label>
        {src ? (
          <NextImage
            unoptimized
            width={1200}
            height={800}
            src={src}
            alt={label}
            style={{ objectFit: fit }}
          />
        ) : (
          <span>
            <ImagePlus size={26} />
            {busy ? "Uploading…" : "Add image"}
          </span>
        )}
        <input
          type="file"
          className="sr-only"
          accept="image/png,image/jpeg,image/webp"
          aria-label={`Upload picture for ${label}`}
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            try {
              onChange(await upload(file));
            } catch (error) {
              toast.error((error as Error).message);
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
        {src && <small>{busy ? "Uploading…" : "Replace image"}</small>}
      </label>
      {src && (
        <button
          type="button"
          className="choice-remove-image"
          aria-label={`Remove picture for ${label}`}
          disabled={busy}
          onClick={() => onChange("")}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}
export default function AnswerEditor({
  question: q,
  onChange,
}: {
  question: Question;
  onChange: (
    patch: Partial<Question>,
    renames?: Record<string, string>,
  ) => boolean | void;
}) {
  const [bulk, setBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState("");
  const choices = q.type.includes("choice") || q.type === "dropdown";
  const pictures =
    q.type !== "dropdown" &&
    (q.choiceStyle === "pictures" ||
      (!q.choiceStyle && Object.values(q.optionImages || {}).some(Boolean)));
  function rename(index: number, label: string) {
    const old = q.options[index];
    const options = q.options.map((x, i) => (i === index ? label : x));
    const images = { ...q.optionImages };
    const src = images[old];
    delete images[old];
    if (src) images[label] = src;
    onChange({ options, optionImages: images }, { [old]: label });
  }
  if (choices)
    return (
      <section className="answer-editor">
        <div className="between">
          <strong>
            {q.type === "dropdown" ? "Dropdown options" : "Answer choices"}
          </strong>
          {q.type !== "dropdown" && (
            <div
              className="answer-style-toggle"
              role="group"
              aria-label="Answer appearance"
            >
              <button
                type="button"
                aria-pressed={!pictures}
                onClick={() => onChange({ choiceStyle: "text" })}
              >
                Text
              </button>
              <button
                type="button"
                aria-pressed={pictures}
                onClick={() => onChange({ choiceStyle: "pictures" })}
              >
                <ImagePlus size={14} />
                Pictures
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          className="btn compact bulk-choices-button"
          onClick={() => {
            setBulkText(q.options.join("\n"));
            setBulkError("");
            setBulk(true);
          }}
        >
          Edit choices in bulk
        </button>
        <Modal
          open={bulk}
          onClose={() => setBulk(false)}
          title="Edit choices in bulk"
          description="One choice per line. Labels containing commas stay together. Up to 30 choices."
        >
          <label>
            Choices (one per line)
            <textarea
              rows={6}
              value={bulkText}
              maxLength={6000}
              onChange={(e) => {
                setBulkText(e.target.value);
                setBulkError("");
              }}
            />
          </label>
          {bulkError && (
            <p className="error" role="alert">
              {bulkError}
            </p>
          )}
          <p className="small">
            Images stay attached to matching labels. Update any rules before
            removing a choice they use.
          </p>
          <div className="row">
            <button className="btn" onClick={() => setBulk(false)}>
              Cancel
            </button>
            <button
              className="btn primary"
              onClick={() => {
                try {
                  const options = parseBulkChoices(bulkText);
                  const optionImages = Object.fromEntries(
                    Object.entries(q.optionImages || {}).filter(([label]) =>
                      options.includes(label),
                    ),
                  );
                  const applied = onChange({ options, optionImages });
                  if (applied !== false) setBulk(false);
                  else
                    setBulkError(
                      "A choice is used by a rule. Update the rule before removing it.",
                    );
                } catch (e) {
                  setBulkError((e as Error).message);
                }
              }}
            >
              Apply choices
            </button>
          </div>
        </Modal>
        {q.type === "dropdown" && (
          <div className="dropdown-example">
            Choose an option
            <ChevronDown size={16} />
          </div>
        )}
        <div
          className={pictures ? "editable-picture-grid" : "editable-options"}
        >
          {q.options.map((option, i) => (
            <div
              className={pictures ? "editable-picture-card" : "editable-option"}
              key={i}
            >
              {pictures ? (
                <ChoiceImage
                  fit={q.choiceImageFit || "cover"}
                  src={q.optionImages?.[option] || ""}
                  label={option || `Option ${i + 1}`}
                  onChange={(src) =>
                    onChange({
                      optionImages: { ...q.optionImages, [option]: src },
                    })
                  }
                />
              ) : (
                <span
                  className={
                    "option-indicator " +
                    (q.type === "multiple choice" ? "square" : "")
                  }
                >
                  {q.type === "dropdown" ? i + 1 : ""}
                </span>
              )}
              <div className="editable-option-label">
                <input
                  className="choice-label-input"
                  type="text"
                  size={1}
                  aria-label={`Option ${i + 1} label`}
                  maxLength={100}
                  placeholder={`Option ${i + 1}`}
                  value={option}
                  onChange={(e) => rename(i, e.target.value)}
                />
                <button
                  type="button"
                  className="icon-btn"
                  disabled={q.options.length <= 2}
                  aria-label={`Remove option ${i + 1}`}
                  onClick={() => {
                    const images = { ...q.optionImages };
                    delete images[option];
                    onChange({
                      options: q.options.filter((_, j) => j !== i),
                      optionImages: images,
                    });
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="text-btn"
          disabled={q.options.length >= 30}
          onClick={() => {
            let n = q.options.length + 1;
            while (q.options.includes(`Option ${n}`)) n++;
            onChange({ options: [...q.options, `Option ${n}`] });
          }}
        >
          <Plus size={15} />
          Add option
        </button>
        {pictures && (
          <label>
            Picture display
            <select
              value={q.choiceImageFit || "cover"}
              onChange={(e) =>
                onChange({
                  choiceImageFit: e.target.value as "cover" | "contain",
                })
              }
            >
              <option value="cover">Fill the card</option>
              <option value="contain">Show the full image</option>
            </select>
          </label>
        )}
      </section>
    );
  return (
    <section className="answer-editor answer-type-preview">
      <span className="section-kicker">CUSTOMER ANSWER</span>
      {q.type === "yes/no" ? (
        <div className="preview-answer-buttons">
          <span>Yes</span>
          <span>No</span>
        </div>
      ) : q.type === "rating" ? (
        <div className="preview-answer-buttons">
          {Array.from(
            { length: q.validation?.ratingMax || 5 },
            (_, i) => i + 1,
          ).map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      ) : q.type === "long text" || q.type === "address" ? (
        <textarea
          disabled
          rows={3}
          placeholder={
            q.type === "address"
              ? "Street address, city…"
              : "Their answer goes here…"
          }
        />
      ) : (
        <input
          disabled
          type={
            ["date", "time", "number", "email", "url"].includes(q.type)
              ? q.type
              : q.type === "phone"
                ? "tel"
                : "text"
          }
          placeholder={
            q.type === "phone"
              ? "+971…"
              : q.type === "email"
                ? "name@example.com"
                : q.type === "url"
                  ? "https://example.com"
                  : "Their answer goes here…"
          }
        />
      )}
    </section>
  );
}
