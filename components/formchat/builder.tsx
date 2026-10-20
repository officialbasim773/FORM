"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Plus,
  Copy,
  Trash2,
  Eye,
  Check,
  Cloud,
  ExternalLink,
  Link2,
  Download,
  GripVertical,
  Package,
  Palette,
  FileText,
  Smartphone,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import {
  Business,
  Draft,
  FormRecord,
  Product,
  Question,
  readableText,
  toMinor,
  money,
  formPages,
} from "@/lib/model";
import { CURRENCIES, PRESETS, QUESTION_TYPES, PLANS } from "@/lib/config";
import { api, copy } from "@/lib/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Picker, Toggle, Modal, ImagePicker } from "./ui";
import Customer from "./customer";
import FlowEditor, { QuestionFlow } from "./flow-editor";
import AnswerEditor from "./answer-editor";
import QuestionMedia from "./media-editor";
import QuestionLibrary from "./question-library";
export function Share({
  form,
  open,
  onClose,
}: {
  form: FormRecord;
  open: boolean;
  onClose: () => void;
}) {
  const [qr, setQr] = useState("");
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = location.origin + "/f/" + form.slug;
    setUrl(u);
    QRCode.toDataURL(u, {
      width: 400,
      margin: 2,
      color: { dark: "#183c2e", light: "#ffffff" },
    })
      .then(setQr)
      .catch(() => toast.error("Could not create the QR code."));
  }, [form.slug]);
  return (
    <Modal
      title="Your form is ready to share"
      description="Send the link to customers or print the QR code."
      open={open}
      onClose={onClose}
    >
      <div className="share-qr">
        {qr && <img src={qr} alt="QR code linking to your published form" />}
      </div>
      <label>
        Public form link
        <input readOnly value={url} />
      </label>
      <div className="row">
        <button
          className="btn primary"
          onClick={() =>
            copy(url)
              .then(() => toast.success("Link copied"))
              .catch(() => toast.error("Select and copy the link above."))
          }
        >
          <Copy size={15} />
          Copy link
        </button>
        <a className="btn" href={url} target="_blank" rel="noreferrer">
          <ExternalLink size={15} />
          Test form
        </a>
      </div>
      {qr && (
        <a className="text-btn" download={`${form.slug}-qr.png`} href={qr}>
          <Download size={15} />
          Download QR code
        </a>
      )}
      <p className="small">
        The public form accepts requests only while it is published.
      </p>
    </Modal>
  );
}
function Price({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [text, setText] = useState((value / 100).toFixed(2));
  useEffect(() => setText((value / 100).toFixed(2)), [value]);
  return (
    <label>
      {label}
      <input
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          try {
            onChange(toMinor(text));
          } catch (e) {
            toast.error((e as Error).message);
            setText((value / 100).toFixed(2));
          }
        }}
      />
    </label>
  );
}
function ProductEditor({
  product: p,
  onChange,
  onDelete,
  currency,
}: {
  product: Product;
  onChange: (p: Product) => void;
  onDelete: () => void;
  currency: string;
}) {
  const [expanded, setExpanded] = useState(p.name === "New product");
  const [removing, setRemoving] = useState(false);
  const upd = (patch: Partial<Product>) => onChange({ ...p, ...patch });
  return (
    <section className="catalog-product">
      <button
        className="catalog-summary"
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="catalog-thumb">
          {p.image ? <img src={p.image} alt="" /> : <Package size={24} />}
        </span>
        <span className="catalog-name">
          <strong>{p.name || "Untitled product"}</strong>
          <small>
            {money(p.price, currency)} ·{" "}
            {p.hidden
              ? "Hidden"
              : p.available === false
                ? "Sold out"
                : "Available"}
            {p.options.length ? ` · ${p.options.length} options` : ""}
          </small>
        </span>
        <span className="catalog-edit">
          {expanded ? "Close" : "Edit product"}
        </span>
      </button>
      {expanded && (
        <div className="product-editor">
          <div className="catalog-section-title">
            <h4>Product details</h4>
            <p>
              Start with a name and price. Add a photo to help customers choose.
            </p>
          </div>
          <label>
            Product name
            <input
              value={p.name}
              maxLength={120}
              onChange={(e) => upd({ name: e.target.value })}
            />
          </label>
          <label>
            Description
            <textarea
              rows={2}
              maxLength={600}
              value={p.description}
              onChange={(e) => upd({ description: e.target.value })}
            />
          </label>
          <ImagePicker value={p.image} onChange={(image) => upd({ image })} />
          <div className="field-grid">
            <Price
              label={`Price per item (${currency})`}
              value={p.price}
              onChange={(price) => upd({ price })}
            />
            <label>
              Minimum quantity
              <input
                type="number"
                min="1"
                max="999"
                value={p.min}
                onChange={(e) => upd({ min: Number(e.target.value) })}
              />
            </label>
            <label>
              Maximum quantity
              <input
                type="number"
                min="1"
                max="999"
                value={p.max}
                onChange={(e) => upd({ max: Number(e.target.value) })}
              />
            </label>
          </div>
          <div className="row">
            <Toggle
              label="Visible on form"
              checked={!p.hidden}
              onChange={(v) => upd({ hidden: !v })}
            />
            <Toggle
              label="Allow item note"
              checked={p.allowNote}
              onChange={(allowNote) => upd({ allowNote })}
            />
          </div>
          <div className="field-grid">
            <label>
              Category
              <input
                maxLength={60}
                value={p.category || ""}
                placeholder="e.g. Cakes, Flowers, Gifts"
                onChange={(e) => upd({ category: e.target.value })}
              />
            </label>
            <label>
              Availability
              <select
                value={p.available === false ? "unavailable" : "available"}
                onChange={(e) =>
                  upd({ available: e.target.value === "available" })
                }
              >
                <option value="available">Available to order</option>
                <option value="unavailable">Sold out / unavailable</option>
              </select>
            </label>
          </div>
          <details className="catalog-options">
            <summary>
              Sizes, choices & personalisation{" "}
              <span>{p.options.length} options</span>
            </summary>
            <h4 className="subhead">Let customers make it their own</h4>
            <p className="small">
              Add sizes, colours or other choices. Price adjustments are added
              to the base price.
            </p>
            <button
              className="btn"
              disabled={p.options.length >= 12}
              onClick={() =>
                upd({
                  options: [
                    ...p.options,
                    {
                      id: crypto.randomUUID(),
                      name: "Size",
                      type: "choice",
                      required: true,
                      values: ["Small", "Medium", "Large"].map((label) => ({
                        id: crypto.randomUUID(),
                        label,
                        adjustment: 0,
                      })),
                    },
                  ],
                })
              }
            >
              Add size choices
            </button>
            {p.options.map((o, index) => (
              <div className="option-editor" key={o.id}>
                <div className="row">
                  <label className="grow">
                    Option name
                    <input
                      value={o.name}
                      onChange={(e) =>
                        upd({
                          options: p.options.map((x) =>
                            x.id === o.id ? { ...x, name: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    className="icon-btn"
                    aria-label={`Remove ${o.name}`}
                    onClick={() =>
                      upd({ options: p.options.filter((x) => x.id !== o.id) })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="row">
                  <Picker
                    value={o.type}
                    label="Option type"
                    options={[
                      { value: "choice", label: "Choose from a list" },
                      { value: "text", label: "Customer writes an answer" },
                    ]}
                    onChange={(type) =>
                      upd({
                        options: p.options.map((x) =>
                          x.id === o.id
                            ? {
                                ...x,
                                type: type as "choice" | "text",
                                values:
                                  type === "choice" && !x.values.length
                                    ? [
                                        {
                                          id: crypto.randomUUID(),
                                          label: "Standard",
                                          adjustment: 0,
                                        },
                                      ]
                                    : x.values,
                              }
                            : x,
                        ),
                      })
                    }
                  />
                  <Toggle
                    label="Required"
                    checked={o.required}
                    onChange={(required) =>
                      upd({
                        options: p.options.map((x) =>
                          x.id === o.id ? { ...x, required } : x,
                        ),
                      })
                    }
                  />
                </div>
                {o.type === "choice" && (
                  <>
                    {o.values.map((v) => (
                      <div className="option-choice" key={v.id}>
                        <label>
                          Choice
                          <input
                            value={v.label}
                            onChange={(e) =>
                              upd({
                                options: p.options.map((x) =>
                                  x.id === o.id
                                    ? {
                                        ...x,
                                        values: x.values.map((y) =>
                                          y.id === v.id
                                            ? { ...y, label: e.target.value }
                                            : y,
                                        ),
                                      }
                                    : x,
                                ),
                              })
                            }
                          />
                        </label>
                        <Price
                          label={`Extra price (${currency})`}
                          value={v.adjustment}
                          onChange={(adjustment) =>
                            upd({
                              options: p.options.map((x) =>
                                x.id === o.id
                                  ? {
                                      ...x,
                                      values: x.values.map((y) =>
                                        y.id === v.id
                                          ? { ...y, adjustment }
                                          : y,
                                      ),
                                    }
                                  : x,
                              ),
                            })
                          }
                        />
                        <button
                          className="icon-btn"
                          aria-label={`Remove choice ${v.label}`}
                          onClick={() =>
                            upd({
                              options: p.options.map((x) =>
                                x.id === o.id
                                  ? {
                                      ...x,
                                      values: x.values.filter(
                                        (y) => y.id !== v.id,
                                      ),
                                    }
                                  : x,
                              ),
                            })
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      className="text-btn"
                      disabled={o.values.length >= 30}
                      onClick={() =>
                        upd({
                          options: p.options.map((x) =>
                            x.id === o.id
                              ? {
                                  ...x,
                                  values: [
                                    ...x.values,
                                    {
                                      id: crypto.randomUUID(),
                                      label: "New choice",
                                      adjustment: 0,
                                    },
                                  ],
                                }
                              : x,
                          ),
                        })
                      }
                    >
                      <Plus size={14} />
                      {o.values.length >= 30
                        ? "Choice limit reached (30)"
                        : "Add choice"}
                    </button>
                  </>
                )}
              </div>
            ))}
            <button
              className="btn"
              disabled={p.options.length >= 12}
              onClick={() =>
                upd({
                  options: [
                    ...p.options,
                    {
                      id: crypto.randomUUID(),
                      name: "Personal message",
                      type: "text",
                      required: false,
                      values: [],
                    },
                  ],
                })
              }
            >
              <Plus size={15} /> Add a personal message field
            </button>
          </details>
          <div className="catalog-footer">
            <button className="btn primary" onClick={() => setExpanded(false)}>
              <Check size={16} /> Done editing
            </button>
            {removing ? (
              <div className="catalog-remove">
                <span>Remove this product from the draft?</span>
                <button className="btn" onClick={() => setRemoving(false)}>
                  Keep product
                </button>
                <button className="btn danger" onClick={onDelete}>
                  Remove product
                </button>
              </div>
            ) : (
              <button className="text-btn" onClick={() => setRemoving(true)}>
                <Trash2 size={15} /> Remove product
              </button>
            )}
          </div>
          <p className="small">
            Changes save automatically. Publish the form to update what
            customers see.
          </p>
        </div>
      )}
    </section>
  );
}
export default function Builder({
  initial,
  business,
  onBack,
  onUpdated,
}: {
  initial: FormRecord;
  business: Business;
  onBack: () => void;
  onUpdated: (f: FormRecord) => void;
}) {
  const [form, setForm] = useState(initial);
  const [draft, setDraft] = useState(initial.draft);
  const [activeQuestion, setActiveQuestion] = useState("__welcome");
  const focusedBuilder = true;
  const selectedQuestion =
    ["__welcome", "__ending"].includes(activeQuestion) ||
    draft.questions.some((q) => q.id === activeQuestion)
      ? activeQuestion
      : draft.questions[0]?.id;
  const [tab, setTab] = useState("questions");
  const [mobile, setMobile] = useState("edit");
  const [status, setStatus] = useState("All changes saved");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState(false);
  const [fullPreview, setFullPreview] = useState(false);
  const [questionLibrary, setQuestionLibrary] = useState(false);
  const [previewWidth, setPreviewWidth] = useState("390");
  const [ready, setReady] = useState(false);
  const latest = useRef(draft);
  latest.current = draft;
  const revision = useRef(initial.revision);
  const saved = useRef(JSON.stringify(initial.draft));
  const queue = useRef(Promise.resolve());
  const recoveryKey = `formchat:owner-draft:${initial.id}`;
  useEffect(() => {
    try {
      const recovered = JSON.parse(localStorage.getItem(recoveryKey) || "null");
      if (
        recovered &&
        recovered.revision === initial.revision &&
        JSON.stringify(recovered.draft) !== saved.current
      ) {
        setDraft(recovered.draft);
        toast.info("Your unsaved draft was restored.");
      }
    } catch {}
    setReady(true);
  }, []);
  function save() {
    const snapshot = structuredClone(latest.current);
    const serialized = JSON.stringify(snapshot);
    const task = queue.current
      .catch(() => {})
      .then(async () => {
        if (saved.current === serialized) return;
        setStatus("Saving…");
        const result = await api(`forms/${initial.id}`, "PATCH", {
          draft: snapshot,
          revision: revision.current,
        });
        revision.current = result.revision;
        saved.current = serialized;
        setForm(result);
        onUpdated(result);
        setError("");
        setStatus("All changes saved");
        try {
          if (JSON.stringify(latest.current) === serialized)
            localStorage.removeItem(recoveryKey);
          else
            localStorage.setItem(
              recoveryKey,
              JSON.stringify({
                draft: latest.current,
                revision: revision.current,
              }),
            );
        } catch {}
      });
    queue.current = task;
    return task;
  }
  useEffect(() => {
    if (!ready || JSON.stringify(draft) === saved.current) return;
    setStatus("Unsaved changes");
    try {
      localStorage.setItem(
        recoveryKey,
        JSON.stringify({ draft, revision: revision.current }),
      );
    } catch {}
    const timer = setTimeout(
      () =>
        save().catch((e) => {
          setStatus("Could not save");
          setError(e.message);
        }),
      900,
    );
    return () => clearTimeout(timer);
  }, [draft, ready]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(latest.current) !== saved.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  function update(patch: Partial<Draft>) {
    const next = { ...draft, ...patch };
    const ids = new Set(next.questions.map((q) => q.id));
    const removedRules =
      next.questions.some(
        (q) => q.condition && !ids.has(q.condition.questionId),
      ) || next.routing?.rules.some((r) => !ids.has(r.condition.questionId));
    next.questions = next.questions.map((q) =>
      q.condition && !ids.has(q.condition.questionId)
        ? { ...q, condition: undefined }
        : q,
    );
    if (next.routing)
      next.routing = {
        ...next.routing,
        rules: next.routing.rules.filter((r) =>
          ids.has(r.condition.questionId),
        ),
      };
    const pages = formPages(next);
    const ordered = pages.flatMap((p) =>
      next.questions.filter((q) => (q.pageId || pages[0].id) === p.id),
    );
    if (
      ordered.some(
        (q, i) =>
          q.condition &&
          !ordered.slice(0, i).some((x) => x.id === q.condition!.questionId),
      )
    ) {
      toast.error(
        "Keep conditional questions after the answer they depend on. Remove the condition first to move them earlier.",
      );
      return;
    }
    if (removedRules)
      toast.info("Rules using the deleted question were removed.");
    setDraft(next);
  }
  function question(id: string, patch: Partial<Question>) {
    const old = draft.questions.find((q) => q.id === id)!;
    const renames = new Map<string, string>();
    if (patch.options && patch.options.length === old.options.length)
      old.options.forEach((label, i) => {
        if (patch.options![i] !== label) renames.set(label, patch.options![i]);
      });
    const adapt = (condition: Question["condition"]) =>
      condition && condition.questionId === id && renames.has(condition.value)
        ? { ...condition, value: renames.get(condition.value)! }
        : condition;
    update({
      questions: draft.questions.map((q) =>
        q.id === id
          ? { ...q, ...patch }
          : { ...q, condition: adapt(q.condition) },
      ),
      ...(draft.routing
        ? {
            routing: {
              ...draft.routing,
              rules: draft.routing.rules.map((r) => ({
                ...r,
                condition: adapt(r.condition)!,
              })),
            },
          }
        : {}),
    });
  }
  async function publish() {
    setBusy(true);
    try {
      await save();
      const f = await api(`forms/${initial.id}/publish`, "POST", {
        revision: revision.current,
      });
      setForm(f);
      onUpdated(f);
      setShare(true);
      toast.success("Your form is published");
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function back() {
    setBusy(true);
    try {
      await save();
      onBack();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const differs =
    !!form.published &&
    JSON.stringify(form.published) !== JSON.stringify(draft);
  const canBrand = PLANS[business.plan].branding;
  return (
    <div className="builder form-studio">
      <header className="builder-header">
        <div className="row">
          <button
            className="icon-btn"
            onClick={back}
            aria-label="Back to forms"
            disabled={busy}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2>{draft.title || "Untitled form"}</h2>
            <span className="save-status">
              <Cloud size={13} />
              {status}
              {differs && <span>· Unpublished changes</span>}
            </span>
          </div>
        </div>
        <div className="row">
          <button
            className="btn preview-button"
            onClick={() => setFullPreview(true)}
          >
            <Eye size={16} />
            Preview form
          </button>
          {form.status === "published" && (
            <button
              className="btn"
              aria-label="Share form"
              onClick={() => setShare(true)}
            >
              <Link2 size={16} />
              <span className="hide-small">Share</span>
            </button>
          )}
          <button className="btn primary" onClick={publish} disabled={busy}>
            {busy
              ? "Publishing…"
              : form.version
                ? "Publish updates"
                : "Publish form"}
            <ArrowRight size={15} />
          </button>
        </div>
      </header>
      {error && (
        <div className="error builder-error" role="alert">
          {error}
          <button
            className="text-btn"
            onClick={() => save().catch((e) => setError(e.message))}
          >
            Retry save
          </button>
        </div>
      )}
      <Tabs
        value={mobile}
        onValueChange={setMobile}
        className="mobile-builder-tabs"
      >
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className={"builder-layout mobile-" + mobile}>
        <section className="editor">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="editor-tabs">
              <TabsTrigger value="questions">
                <FileText size={15} />
                Build
              </TabsTrigger>
              {draft.type === "product" && (
                <TabsTrigger value="products">
                  <Package size={15} />
                  Products
                </TabsTrigger>
              )}
              <TabsTrigger value="flow">Settings</TabsTrigger>
              <TabsTrigger value="appearance">
                <Palette size={15} />
                Design
              </TabsTrigger>
            </TabsList>
            <TabsContent value="flow">
              <FlowEditor draft={draft} onChange={update} />
            </TabsContent>
            <TabsContent value="questions" className="studio-content">
              <div
                className="editor-intro studio-welcome"
                hidden={selectedQuestion !== "__welcome"}
              >
                <h3>Welcome screen</h3>
                <p>
                  Give people a clear title and tell them what this form is for.
                </p>
                <label>
                  Form title
                  <input
                    value={draft.title}
                    maxLength={120}
                    onChange={(e) => update({ title: e.target.value })}
                  />
                </label>
                <label>
                  Short description
                  <textarea
                    rows={2}
                    maxLength={700}
                    value={draft.description}
                    onChange={(e) => update({ description: e.target.value })}
                  />
                </label>
              </div>
              <div className="between question-heading" hidden>
                <span className="section-kicker">QUESTIONS</span>
                <span className="small">
                  {draft.questions.length} questions
                </span>
              </div>
              {focusedBuilder && (
                <nav className="question-navigator" aria-label="Form questions">
                  <span className="studio-outline-label">FORM CONTENT</span>
                  <button
                    type="button"
                    aria-current={
                      selectedQuestion === "__welcome" ? "step" : undefined
                    }
                    onClick={() => setActiveQuestion("__welcome")}
                  >
                    <span>↗</span>
                    <strong>Welcome</strong>
                    <small>Title & description</small>
                  </button>
                  {draft.questions.map((q, i) => (
                    <button
                      type="button"
                      key={q.id}
                      aria-current={
                        selectedQuestion === q.id ? "step" : undefined
                      }
                      onClick={() => setActiveQuestion(q.id)}
                    >
                      <span>{i + 1}</span>
                      <strong>{q.label || "Untitled question"}</strong>
                      <small>
                        {q.choiceStyle === "pictures"
                          ? "Picture choice"
                          : q.type}
                      </small>
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-current={
                      selectedQuestion === "__ending" ? "step" : undefined
                    }
                    onClick={() => setActiveQuestion("__ending")}
                  >
                    <span>✓</span>
                    <strong>Ending</strong>
                    <small>After submission</small>
                  </button>
                </nav>
              )}
              {selectedQuestion === "__ending" && (
                <section className="studio-ending">
                  <h3>After submission</h3>
                  <p>
                    Answers are saved to Responses before the customer continues
                    to WhatsApp.
                  </p>
                  <ol>
                    <li>The customer submits their answers.</li>
                    <li>FormChat saves the response and its reference.</li>
                    <li>
                      WhatsApp opens with a prepared summary. The customer taps
                      Send.
                    </li>
                  </ol>
                  <p className="small">
                    A saved response does not depend on sending the WhatsApp
                    message.
                  </p>
                  <button className="btn" onClick={() => setFullPreview(true)}>
                    Test the full form
                  </button>
                </section>
              )}
              {draft.questions.map(
                (q, index) =>
                  (!focusedBuilder || q.id === selectedQuestion) && (
                    <div className="question-editor" key={q.id}>
                      <div className="question-top">
                        <span className="question-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <Picker
                          label="Question type"
                          value={q.type}
                          options={[...QUESTION_TYPES]}
                          onChange={(type) =>
                            question(q.id, {
                              type: type as Question["type"],
                              options:
                                (type.includes("choice") ||
                                  type === "dropdown") &&
                                q.options.length < 2
                                  ? ["Option 1", "Option 2"]
                                  : q.options,
                            })
                          }
                        />
                        <div className="question-actions">
                          <select
                            className="question-position"
                            aria-label={`Position of question ${index + 1}`}
                            value={index}
                            onChange={(e) => {
                              const arr = [...draft.questions];
                              const [moved] = arr.splice(index, 1);
                              arr.splice(Number(e.target.value), 0, moved);
                              update({ questions: arr });
                            }}
                          >
                            {draft.questions.map((_, position) => (
                              <option key={position} value={position}>
                                {position + 1}
                              </option>
                            ))}
                          </select>
                          <button
                            className="icon-btn"
                            aria-label={`Move question ${index + 1} up`}
                            disabled={!index}
                            onClick={() => {
                              const arr = [...draft.questions];
                              [arr[index - 1], arr[index]] = [
                                arr[index],
                                arr[index - 1],
                              ];
                              update({ questions: arr });
                            }}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            className="icon-btn"
                            aria-label={`Move question ${index + 1} down`}
                            disabled={index === draft.questions.length - 1}
                            onClick={() => {
                              const arr = [...draft.questions];
                              [arr[index + 1], arr[index]] = [
                                arr[index],
                                arr[index + 1],
                              ];
                              update({ questions: arr });
                            }}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            className="icon-btn"
                            aria-label={`Duplicate question ${index + 1}`}
                            onClick={() => {
                              const arr = [...draft.questions];
                              arr.splice(index + 1, 0, {
                                ...structuredClone(q),
                                id: crypto.randomUUID(),
                              });
                              update({ questions: arr });
                            }}
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            className="icon-btn"
                            aria-label={`Delete question ${index + 1}`}
                            disabled={draft.questions.length === 1}
                            onClick={() =>
                              update({
                                questions: draft.questions.filter(
                                  (x) => x.id !== q.id,
                                ),
                              })
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <label>
                        Question
                        <input
                          value={q.label}
                          maxLength={180}
                          onChange={(e) =>
                            question(q.id, { label: e.target.value })
                          }
                        />
                      </label>
                      <AnswerEditor
                        question={q}
                        onChange={(patch) => question(q.id, patch)}
                      />
                      <label>
                        Help text <span className="optional">(optional)</span>
                        <input
                          maxLength={400}
                          placeholder="A useful hint or example"
                          value={q.description || ""}
                          onChange={(e) =>
                            question(q.id, { description: e.target.value })
                          }
                        />
                      </label>
                      <details className="studio-advanced">
                        <summary>Image or video</summary>
                        <QuestionMedia
                          question={q}
                          onChange={(patch) => question(q.id, patch)}
                        />
                      </details>
                      <details className="studio-advanced">
                        <summary>
                          Logic and visibility
                          {q.condition ? " · Conditional" : ""}
                        </summary>
                        <QuestionFlow
                          draft={draft}
                          question={q}
                          onChange={(patch) => question(q.id, patch)}
                        />
                      </details>
                      <Toggle
                        label="Required"
                        checked={q.required}
                        onChange={(required) => question(q.id, { required })}
                      />
                    </div>
                  ),
              )}
              <button
                type="button"
                className="btn add-question"
                disabled={draft.questions.length >= 40}
                onClick={() => setQuestionLibrary(true)}
              >
                <Plus size={17} />
                Add question <span className="small">14 answer formats</span>
              </button>
              {draft.questions.length >= 40 && (
                <p className="small">
                  This form has reached the 40-question limit.
                </p>
              )}
            </TabsContent>
            <TabsContent value="products" className="catalog-panel">
              <div className="editor-intro">
                <h3>
                  Product catalog{" "}
                  <span className="catalog-count">{draft.products.length}</span>
                </h3>
                <p>
                  Add your products, then open a card to edit its details.
                  Customers choose items before answering your form questions.
                </p>
                <label>
                  Currency
                  <Picker
                    value={draft.currency}
                    label="Currency"
                    options={[...CURRENCIES]}
                    onChange={(currency) =>
                      update({ currency: currency as Draft["currency"] })
                    }
                  />
                </label>
              </div>
              <details className="fulfillment-setup">
                <summary>
                  Delivery & pickup <span>Optional setup</span>
                </summary>
                <p className="small">
                  Add a delivery/pickup choice and an address shown only for
                  delivery. An existing address question will be reused. Edit
                  both in Build; their answers appear in the saved request and
                  WhatsApp message.
                </p>
                <button
                  className="btn"
                  disabled={
                    draft.questions.length > 38 ||
                    draft.questions.some((q) => q.id === "fulfillment-method")
                  }
                  onClick={() => {
                    const existing = draft.questions.find(
                      (q) => q.type === "address",
                    );
                    const pageId = existing
                      ? existing.pageId
                      : draft.pages?.at(-1)?.id;
                    const method: Question = {
                      id: "fulfillment-method",
                      label: "How would you like to receive your order?",
                      type: "single choice",
                      required: true,
                      options: ["Delivery", "Pickup"],
                      pageId,
                    };
                    const address: Question = {
                      ...(existing || {
                        id: "fulfillment-address",
                        label: "Delivery address",
                        type: "address" as const,
                        options: [],
                        pageId,
                      }),
                      required: true,
                      condition: {
                        questionId: "fulfillment-method",
                        operator: "equals",
                        value: "Delivery",
                      },
                    };
                    const questions = existing
                      ? draft.questions.flatMap((q) =>
                          q.id === existing.id ? [method, address] : [q],
                        )
                      : [...draft.questions, method, address];
                    update({ questions });
                    toast.success("Delivery and pickup questions added");
                  }}
                >
                  {draft.questions.some((q) => q.id === "fulfillment-method")
                    ? "Delivery & pickup added"
                    : "Add delivery & pickup"}
                </button>
              </details>
              {!draft.products.length && (
                <div className="catalog-empty">
                  <Package size={32} />
                  <h4>Add your first product</h4>
                  <p>
                    A name and price are enough to start. Photos and options can
                    come later.
                  </p>
                </div>
              )}
              {draft.products.map((p) => (
                <ProductEditor
                  key={p.id}
                  product={p}
                  currency={draft.currency}
                  onChange={(product) =>
                    update({
                      products: draft.products.map((x) =>
                        x.id === p.id ? product : x,
                      ),
                    })
                  }
                  onDelete={() =>
                    update({
                      products: draft.products.filter((x) => x.id !== p.id),
                    })
                  }
                />
              ))}
              <button
                className="btn primary catalog-add"
                disabled={draft.products.length >= 40}
                onClick={() =>
                  update({
                    products: [
                      ...draft.products,
                      {
                        id: crypto.randomUUID(),
                        name: "New product",
                        description: "",
                        image: "",
                        price: 0,
                        min: 1,
                        max: 10,
                        hidden: false,
                        allowNote: true,
                        options: [],
                      },
                    ],
                  })
                }
              >
                <Plus size={17} />
                {draft.products.length >= 40
                  ? "Product limit reached (40)"
                  : "Add product"}
              </button>
            </TabsContent>
            <TabsContent value="appearance">
              <div className="editor-intro">
                <h3>A familiar face for your business</h3>
                <p>
                  Customers will see your business name and logo on the form.
                </p>
                <div className="identity-preview">
                  {business.logo && (
                    <img src={business.logo} alt="Business logo" />
                  )}
                  <strong>{business.name}</strong>
                  <span className="small">
                    Edit your name and logo in Business settings.
                  </span>
                </div>
                {!canBrand && (
                  <p className="notice">
                    Custom colours and logo visibility are included in Business.
                    Payment is not connected yet.
                  </p>
                )}
                <fieldset disabled={!canBrand}>
                  <label>Accent colour</label>
                  <div className="color-presets">
                    {PRESETS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        aria-label={`Use colour ${c}`}
                        className={draft.accent === c ? "active" : ""}
                        style={{ background: c }}
                        onClick={() => update({ accent: c, button: c })}
                      >
                        {draft.accent === c && (
                          <Check size={16} color={readableText(c)} />
                        )}
                      </button>
                    ))}
                    <input
                      aria-label="Custom accent colour"
                      type="color"
                      value={draft.accent}
                      onChange={(e) => update({ accent: e.target.value })}
                    />
                  </div>
                  <label className="color-label">
                    Button colour{" "}
                    <input
                      type="color"
                      value={draft.button}
                      onChange={(e) => update({ button: e.target.value })}
                    />
                  </label>
                  <p className="small">
                    Button text adjusts automatically for readable contrast.
                    Body text stays dark.
                  </p>
                  <Toggle
                    label="Show business logo"
                    checked={!draft.hideLogo}
                    onChange={(show) => update({ hideLogo: !show })}
                  />
                </fieldset>
              </div>
            </TabsContent>
          </Tabs>
        </section>
        <aside className="builder-preview">
          <div className="preview-label">
            <span>
              <Smartphone size={15} />
              LIVE PREVIEW
            </span>
            <span>Changes appear as you edit</span>
          </div>
          <label className="preview-size">
            Preview width
            <select
              value={previewWidth}
              onChange={(e) => setPreviewWidth(e.target.value)}
            >
              <option value="320">Small phone · 320px</option>
              <option value="390">Phone · 390px</option>
              <option value="430">Large phone · 430px</option>
            </select>
          </label>
          <div
            className="phone-frame"
            style={{ width: `${previewWidth}px`, maxWidth: "100%" }}
          >
            <div className="phone-bar">
              <span>9:41</span>
              <span>••• ▰</span>
            </div>
            {!fullPreview && (
              <Customer
                draft={draft}
                business={business}
                preview
                previewQuestionId={
                  draft.experience === "interactive" &&
                  tab === "questions" &&
                  !selectedQuestion?.startsWith("__")
                    ? selectedQuestion
                    : undefined
                }
              />
            )}
          </div>
          <div className="preview-foot">
            <Eye size={14} />
            Preview only · answers are not saved.
          </div>
        </aside>
      </div>
      <QuestionLibrary
        open={questionLibrary}
        onClose={() => setQuestionLibrary(false)}
        onAdd={(q) => {
          update({ questions: [...latest.current.questions, q] });
          setActiveQuestion(q.id);
        }}
      />
      <Modal
        open={fullPreview}
        onClose={() => setFullPreview(false)}
        title="Preview your form"
        description="Try every question. Preview answers are never saved or sent."
      >
        {fullPreview && (
          <div className="studio-test">
            <Customer
              key="full-preview"
              draft={draft}
              business={business}
              preview
            />
          </div>
        )}
      </Modal>
      <Share form={form} open={share} onClose={() => setShare(false)} />
    </div>
  );
}
