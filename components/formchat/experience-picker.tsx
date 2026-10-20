"use client";
import { Check, FileText, Layers, MessageCircle } from "lucide-react";
export const experiences = [
  {
    id: "classic",
    title: "All questions",
    description: "All questions on one page",
    icon: FileText,
  },
  {
    id: "multipage",
    title: "Sections",
    description: "Grouped into simple steps",
    icon: Layers,
  },
  {
    id: "interactive",
    title: "One at a time",
    description: "One question at a time",
    icon: MessageCircle,
  },
] as const;
export default function ExperiencePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: "classic" | "multipage" | "interactive") => void;
}) {
  return (
    <div className="experience-cards" role="group" aria-label="Form experience">
      {experiences.map(({ id, title, description, icon: Icon }) => (
        <button
          type="button"
          key={id}
          className={value === id ? "active" : ""}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          <span className="experience-card-top">
            <Icon size={22} />
            <span className="experience-radio">
              {value === id && <Check size={12} />}
            </span>
          </span>
          <span className={`experience-sketch sketch-${id}`} aria-hidden="true">
            <i />
            <i />
            <i />
            <b />
          </span>
          <strong>{title}</strong>
          <small>{description}</small>
          {id === "interactive" && (
            <span className="experience-new">VISUAL & GUIDED</span>
          )}
        </button>
      ))}
    </div>
  );
}
