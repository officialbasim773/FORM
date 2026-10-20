"use client";
import { useState } from "react";
import {
  Type,
  AlignLeft,
  Phone,
  Mail,
  CalendarDays,
  Clock3,
  Hash,
  MapPin,
  CircleDot,
  ListChecks,
  ChevronDown,
  Star,
  Link,
  ToggleLeft,
  Search,
  Plus,
} from "lucide-react";
import { Question } from "@/lib/model";
import { Modal } from "./ui";
const fields: {
  type: Question["type"];
  title: string;
  description: string;
  icon: typeof Type;
  label: string;
  options?: string[];
}[] = [
  {
    type: "short text",
    title: "Short answer",
    description: "Names and quick details",
    icon: Type,
    label: "Your name",
  },
  {
    type: "long text",
    title: "Long answer",
    description: "Requests, instructions and context",
    icon: AlignLeft,
    label: "Tell us more about your request",
  },
  {
    type: "single choice",
    title: "Single choice",
    description: "Choose one visible option",
    icon: CircleDot,
    label: "Which option would you prefer?",
    options: ["Option 1", "Option 2"],
  },
  {
    type: "multiple choice",
    title: "Multiple choice",
    description: "Choose more than one option",
    icon: ListChecks,
    label: "Which options do you need?",
    options: ["Option 1", "Option 2"],
  },
  {
    type: "dropdown",
    title: "Dropdown",
    description: "A compact list of choices",
    icon: ChevronDown,
    label: "Choose an option",
    options: ["Option 1", "Option 2"],
  },
  {
    type: "yes/no",
    title: "Yes / No",
    description: "A simple two-way decision",
    icon: ToggleLeft,
    label: "Would you like us to contact you?",
  },
  {
    type: "rating",
    title: "Rating",
    description: "Choose a score from 1 to 5",
    icon: Star,
    label: "How would you rate your experience?",
  },
  {
    type: "phone",
    title: "Phone number",
    description: "A number to get in touch",
    icon: Phone,
    label: "WhatsApp number",
  },
  {
    type: "email",
    title: "Email address",
    description: "Validate an email address",
    icon: Mail,
    label: "Email address",
  },
  {
    type: "url",
    title: "Website link",
    description: "A website or reference link",
    icon: Link,
    label: "Website or reference link",
  },
  {
    type: "date",
    title: "Date",
    description: "A preferred or required date",
    icon: CalendarDays,
    label: "Preferred date",
  },
  {
    type: "time",
    title: "Time",
    description: "A preferred time of day",
    icon: Clock3,
    label: "Preferred time",
  },
  {
    type: "number",
    title: "Number",
    description: "Guests, measurements or amounts",
    icon: Hash,
    label: "How many people?",
  },
  {
    type: "address",
    title: "Address",
    description: "Service or delivery location",
    icon: MapPin,
    label: "Delivery address",
  },
];
const suggestions: {
  label: string;
  type: Question["type"];
  options?: string[];
}[] = [
  {
    label: "Collection or delivery?",
    type: "single choice",
    options: ["Collection", "Delivery"],
  },
  { label: "Any allergies or dietary requirements?", type: "long text" },
  { label: "What is your budget?", type: "number" },
  {
    label: "How did you hear about us?",
    type: "dropdown",
    options: ["Instagram", "A friend", "Google", "Other"],
  },
  { label: "When do you need this?", type: "date" },
  { label: "Is this a gift?", type: "yes/no" },
];
export default function QuestionLibrary({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (q: Question) => void;
}) {
  const [search, setSearch] = useState("");
  function add(q: {
    label: string;
    type: Question["type"];
    options?: string[];
  }) {
    onAdd({
      label: q.label,
      type: q.type,
      id: crypto.randomUUID(),
      required: false,
      options: q.options || [],
    });
    setSearch("");
    onClose();
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ask the right question"
      description="Choose an answer format or start with a ready-made question. You can edit it afterwards."
    >
      <div className="question-library">
        <label className="question-search">
          <Search size={18} />
          <input
            aria-label="Search question types"
            placeholder="Search questions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="question-type-grid">
          {fields
            .filter((f) =>
              (f.title + " " + f.description)
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((f) => (
              <button type="button" key={f.type} onClick={() => add(f)}>
                <f.icon size={21} />
                <span>
                  <strong>{f.title}</strong>
                  <small>{f.description}</small>
                </span>
                <Plus size={15} />
              </button>
            ))}
        </div>
        {!fields.some((f) =>
          (f.title + " " + f.description)
            .toLowerCase()
            .includes(search.toLowerCase()),
        ) && (
          <p role="status">No matching type. Try “choice”, “date” or “text”.</p>
        )}
        {!search && (
          <>
            <h3>Useful starting points</h3>
            <div className="question-suggestions">
              {suggestions.map((q) => (
                <button type="button" key={q.label} onClick={() => add(q)}>
                  <Plus size={15} />
                  {q.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
