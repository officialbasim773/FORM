"use client";
import NextImage from "next/image";
import {
  FileText,
  Plus,
  CheckCircle2,
  Package,
  Type,
  AlignLeft,
  Mail,
  Phone,
  CalendarDays,
  Clock3,
  Hash,
  MapPin,
  CircleDot,
  ListChecks,
  ChevronDown,
  Star,
  Link2,
  ToggleLeft,
  GitBranch,
} from "lucide-react";
import type { Draft, Question } from "@/lib/model";
export const fieldIcons = {
  "short text": Type,
  "long text": AlignLeft,
  email: Mail,
  phone: Phone,
  date: CalendarDays,
  time: Clock3,
  number: Hash,
  address: MapPin,
  "single choice": CircleDot,
  "multiple choice": ListChecks,
  dropdown: ChevronDown,
  rating: Star,
  url: Link2,
  "yes/no": ToggleLeft,
};
function Answer({ q }: { q: Question }) {
  if (q.type.includes("choice") || q.type === "yes/no" || q.type === "rating") {
    const options =
      q.type === "yes/no"
        ? ["Yes", "No"]
        : q.type === "rating"
          ? Array.from({ length: q.validation?.ratingMax || 5 }, (_, i) =>
              String(i + 1),
            )
          : q.options;
    return (
      <div
        className={
          "canvas-options " +
          (q.choiceStyle === "pictures" ? "canvas-pictures" : "")
        }
      >
        {options.slice(0, 6).map((o) => (
          <span key={o}>
            {q.optionImages?.[o] && q.choiceStyle !== "text" && (
              <NextImage
                unoptimized
                width={1200}
                height={800}
                src={q.optionImages[o]}
                alt=""
              />
            )}
            {q.type === "rating" ? (
              <Star size={15} />
            ) : (
              <i className={q.type === "multiple choice" ? "square" : ""} />
            )}{" "}
            {o}
          </span>
        ))}
        {options.length > 6 && (
          <small>+ {options.length - 6} more choices</small>
        )}
      </div>
    );
  }
  return (
    <span className="canvas-answer">
      {q.placeholder ||
        (q.type === "dropdown"
          ? "Choose an option"
          : q.type === "date"
            ? "Choose a date"
            : q.type === "time"
              ? "Choose a time"
              : q.type === "email"
                ? "name@example.com"
                : "Your answer here…")}
      {q.type === "dropdown" && <ChevronDown size={15} />}
    </span>
  );
}
export default function FormCanvas({
  draft,
  active,
  onSelect,
  onAdd,
  onProducts,
}: {
  draft: Draft;
  active: string | undefined;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onProducts: () => void;
}) {
  return (
    <div className="form-canvas" aria-label="Form canvas">
      <div className="canvas-toolbar">
        <span>
          <FileText size={15} /> FORM CANVAS
        </span>
        <small>Select a block to edit</small>
      </div>
      <button
        type="button"
        className={
          "canvas-block canvas-welcome " +
          (active === "__welcome" ? "selected" : "")
        }
        aria-pressed={active === "__welcome"}
        onClick={() => onSelect("__welcome")}
      >
        <span className="canvas-block-kind">WELCOME</span>
        <h2>{draft.title || "Untitled form"}</h2>
        <p>
          {draft.description || "Add a description to welcome your customers."}
        </p>
      </button>
      {draft.type === "product" && (
        <button className="canvas-products" onClick={onProducts}>
          <Package size={23} />
          <span>
            <strong>{draft.products.length} products</strong>
            <small>Edit your catalog, options and prices</small>
          </span>
          <span>Manage →</span>
        </button>
      )}
      {draft.questions.map((q, i) => {
        const Icon = fieldIcons[q.type];
        const page = draft.pages?.find((p) => p.id === q.pageId);
        return (
          <div key={q.id} className="canvas-question-wrap">
            {page && draft.questions[i - 1]?.pageId !== q.pageId && (
              <span className="canvas-page-label">{page.title}</span>
            )}
            <button
              type="button"
              className={"canvas-block " + (active === q.id ? "selected" : "")}
              aria-pressed={active === q.id}
              aria-label={`Edit question ${i + 1}: ${q.label}`}
              onClick={() => onSelect(q.id)}
            >
              <span className="canvas-block-kind">
                <Icon size={14} />
                {i + 1} · {q.type}
                {q.condition && (
                  <span>
                    <GitBranch size={12} /> Conditional
                  </span>
                )}
              </span>
              <strong className="canvas-question-title">
                {q.label || "Untitled question"}
                {q.required && <span className="canvas-required"> *</span>}
              </strong>
              {q.description && <p>{q.description}</p>}
              {q.media?.src && (
                <NextImage
                  unoptimized
                  width={1200}
                  height={800}
                  className="canvas-media"
                  src={q.media.src}
                  alt={q.media.alt}
                  style={{ objectFit: q.media.fit }}
                />
              )}
              <Answer q={q} />
            </button>
          </div>
        );
      })}
      <button
        className="canvas-add"
        onClick={onAdd}
        disabled={draft.questions.length >= 40}
      >
        <Plus size={18} />
        {draft.questions.length >= 40
          ? "Question limit reached (40)"
          : "Add a question"}
      </button>
      <button
        className={
          "canvas-block canvas-ending " +
          (active === "__ending" ? "selected" : "")
        }
        aria-pressed={active === "__ending"}
        onClick={() => onSelect("__ending")}
      >
        <CheckCircle2 size={22} />
        <span>
          <strong>Response saved. Conversation ready.</strong>
          <small>
            Your customer reviews their request, then taps Send in WhatsApp.
          </small>
        </span>
      </button>
    </div>
  );
}
