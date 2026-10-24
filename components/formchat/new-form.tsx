"use client";

import { useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Check,
  Package,
  Briefcase,
  LayoutTemplate,
} from "lucide-react";
import { toast } from "sonner";
import { FormRecord } from "@/lib/model";
import { TEMPLATES } from "@/lib/templates";
import { api } from "@/lib/client";
import { Modal } from "./ui";

export default function NewForm({
  open,
  onClose,
  onCreated,
  initialType = "service",
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (f: FormRecord) => void;
  initialType?: "service" | "product";
}) {
  const [type, setType] = useState(initialType);
  const experience = "interactive";
  const [selected, setSelected] = useState("blank");
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title="Create a form"
      description="Start with a blank form or a template. Add and edit questions in the builder."
      open={open}
      onClose={onClose}
    >
      <div className="type-options">
        <button
          className={type === "service" ? "active" : ""}
          onClick={() => {
            setType("service");
            setSelected("blank");
          }}
        >
          <Briefcase size={22} />
          <strong>Form</strong>
          <small>Questions, feedback and enquiries</small>
        </button>
        <button
          className={type === "product" ? "active" : ""}
          onClick={() => {
            setType("product");
            setSelected("product");
          }}
        >
          <Package size={22} />
          <strong>Product order</strong>
          <small>Products, options & quantities</small>
        </button>
      </div>
      <p className="creation-hint">
        One question at a time, with a welcome screen and a clear finish. You
        can change the layout later in Settings.
      </p>
      <div className="template-list">
        {TEMPLATES.filter(
          (t) =>
            (t.type === type || t.id === "blank") && t.id !== "appointment",
        )
          .sort((a, b) => Number(b.id === "blank") - Number(a.id === "blank"))
          .map((t) => (
            <button
              key={t.id}
              className={selected === t.id ? "active" : ""}
              onClick={() => setSelected(t.id)}
            >
              <LayoutTemplate size={19} />
              <span>
                <strong>{t.title}</strong>
                <small>{t.description}</small>
              </span>
              {selected === t.id ? (
                <Check size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
          ))}
      </div>
      {type === "product" && (
        <p className="small">
          You can build a product form on Free. Publishing it requires Business.
        </p>
      )}
      <button
        className="btn primary full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            onCreated(
              await api("forms", "POST", {
                template: selected,
                type,
                experience,
              }),
            );
            onClose();
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Creating…" : "Create form"}
        <ArrowRight size={16} />
      </button>
    </Modal>
  );
}
