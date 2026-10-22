"use client";
import { usePublicEmbed } from "@/lib/use-public-embed";
import { formAppearance, appearanceVariables } from "@/lib/form-appearance";
import { formatAppointment } from "@/lib/appointments";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  Copy,
  RefreshCw,
  ArrowLeft,
  Plus,
  Minus,
} from "lucide-react";
import {
  Draft,
  FormMedia,
  Answers,
  Selection,
  Business,
  Receipt,
  calculateItems,
  validateAnswers,
  money,
  readableText,
  visibleQuestions,
  formPages,
} from "@/lib/model";
import { PRODUCT_NAME } from "@/lib/config";
import { api, copy } from "@/lib/client";
import { Picker } from "./ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Toaster, toast } from "sonner";
function FormImage({ media }: { media: FormMedia }) {
  return (
    <figure className="form-media">
      <img
        src={media.src}
        alt={media.alt}
        style={{ objectFit: media.fit }}
        loading="lazy"
      />
    </figure>
  );
}
export function ReceiptView({ receipt: r }: { receipt: Receipt }) {
  return (
    <>
      <div className="receipt-answers">
        {r.answers
          .filter((a) => a.value.length)
          .map((a, i) => (
            <div key={i}>
              <dt>{a.label}</dt>
              <dd dir="auto">
                {Array.isArray(a.value) ? a.value.join(", ") : a.value}
              </dd>
            </div>
          ))}
      </div>
      {r.items.map((i, n) => (
        <div className="receipt-item" key={n}>
          <div className="between">
            <strong>
              {i.quantity} × {i.name}
            </strong>
            <strong>{money(i.total, r.currency)}</strong>
          </div>
          {i.options
            .filter((o) => o.value)
            .map((o, j) => (
              <p key={j}>
                {o.name}: {o.value}
                {o.adjustment
                  ? ` (+${money(o.adjustment, r.currency)} each)`
                  : ""}
              </p>
            ))}
          {i.note && <p dir="auto">Note: {i.note}</p>}
        </div>
      ))}
      {!!r.items.length && (
        <div className="estimated between">
          <strong>Estimated total</strong>
          <strong>{money(r.total, r.currency)}</strong>
        </div>
      )}
    </>
  );
}
function CustomerContent({
  draft,
  business,
  slug,
  version,
  preview = false,
  previewQuestionId,
  embedded = false,
}: {
  draft: Draft;
  business: Pick<Business, "name" | "logo">;
  slug?: string;
  version?: number;
  preview?: boolean;
  previewQuestionId?: string;
  embedded?: boolean;
}) {
  const [welcomed, setWelcomed] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [productSearch, setProductSearch] = useState("");
  const [category, setCategory] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [selections, setSelections] = useState<Selection[]>([]);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [website, setWebsite] = useState("");
  const [opened, setOpened] = useState(false);
  const [previewReview, setPreviewReview] = useState(false);
  const [restored, setRestored] = useState(false);
  const meta = useRef({
    visitor: "",
    idempotency: "",
    token: "",
    startedAt: Date.now(),
  });
  const started = useRef(false);
  const scrollTop = useRef<HTMLDivElement>(null);
  const key = `formchat:${slug}:draft`;
  useEffect(() => {
    if (preview) {
      setRestored(true);
      return;
    }
    let visitor = "";
    try {
      visitor = localStorage.getItem("formchat:visitor") || crypto.randomUUID();
      localStorage.setItem("formchat:visitor", visitor);
      const saved = JSON.parse(sessionStorage.getItem(key) || "null");
      if (saved) {
        setAnswers(saved.answers || {});
        setPageIndex(
          Number.isInteger(saved.pageIndex) && saved.pageIndex >= 0
            ? Math.min(saved.pageIndex, 40)
            : 0,
        );
        setSelections(saved.selections || []);
        meta.current = { ...saved.meta, visitor };
        if (saved.receipt) setReceipt(saved.receipt);
      } else
        meta.current = {
          visitor,
          idempotency: crypto.randomUUID(),
          token: crypto.randomUUID(),
          startedAt: Date.now(),
        };
    } catch {
      meta.current = {
        visitor: crypto.randomUUID(),
        idempotency: crypto.randomUUID(),
        token: crypto.randomUUID(),
        startedAt: Date.now(),
      };
    }
    setRestored(true);
    api(`public/${slug}/event`, "POST", {
      kind: "view",
      visitor: meta.current.visitor,
    }).catch(() => {});
  }, [slug, preview, key]);
  useEffect(() => {
    if (restored && !preview)
      try {
        sessionStorage.setItem(
          key,
          JSON.stringify({
            answers,
            selections,
            pageIndex,
            meta: meta.current,
            receipt,
          }),
        );
      } catch {}
  }, [answers, selections, pageIndex, receipt, restored, preview, key]);
  function start() {
    if (preview || started.current) return;
    started.current = true;
    api(`public/${slug}/event`, "POST", {
      kind: "start",
      visitor: meta.current.visitor,
    }).catch(() => {});
  }
  function select(productId: string, patch: Partial<Selection>) {
    start();
    setSelections((prev) => {
      const existing = prev.find((s) => s.productId === productId);
      return existing
        ? prev.map((s) => (s.productId === productId ? { ...s, ...patch } : s))
        : [
            ...prev,
            {
              productId,
              quantity: draft.products.find((p) => p.id === productId)!.min,
              options: {},
              ...patch,
            },
          ];
    });
  }
  let total: number | null = 0;
  let estimatedItems: ReturnType<typeof calculateItems> = [];
  try {
    estimatedItems = calculateItems(
      {
        ...draft,
        products: draft.products.map((p) => ({
          ...p,
          options: p.options.map((o) => ({ ...o, required: false })),
        })),
      },
      selections,
    );
    total = estimatedItems.reduce((n, i) => n + i.total, 0);
  } catch {
    total = null;
  }
  const visible =
    preview && previewQuestionId
      ? draft.questions
      : visibleQuestions(draft, answers);
  const allPages = formPages(draft);
  const experience =
    draft.experience || (allPages.length > 1 ? "multipage" : "classic");
  const interactive = experience === "interactive";
  const settings = {
    welcome: true,
    progress: true,
    keyboard: true,
    startLabel: "Let’s start",
    ...draft.interactive,
  };
  const pages = interactive
    ? [
        ...(draft.type === "product"
          ? [{ id: "__catalog", title: "Choose your items" }]
          : []),
        ...visible.map((q) => ({ id: q.id, title: q.label })),
      ]
    : experience === "classic"
      ? [{ id: "__all", title: "Your details" }]
      : allPages.filter(
          (p, i) =>
            (i === 0 && draft.type === "product") ||
            visible.some((q) => (q.pageId || allPages[0].id) === p.id),
        );
  if (!pages.length) pages.push(allPages[0]);
  const step = Math.min(pageIndex, pages.length - 1);
  const currentPage = pages[step];
  const pageQuestions = interactive
    ? visible.filter((q) => q.id === currentPage.id)
    : experience === "classic"
      ? visible
      : visible.filter((q) => (q.pageId || allPages[0].id) === currentPage.id);
  const lastPage = step === pages.length - 1;
  useEffect(() => {
    if (preview && previewQuestionId) {
      setWelcomed(true);
      setPreviewReview(false);
      const index = pages.findIndex((p) => p.id === previewQuestionId);
      if (index >= 0) setPageIndex(index);
    } else if (preview) {
      setPageIndex(0);
      setPreviewReview(false);
    }
  }, [previewQuestionId, preview, experience]);
  const previousExperience = useRef(experience);
  useEffect(() => {
    if (previousExperience.current !== experience) {
      setPageIndex(0);
      setWelcomed(false);
      setPreviewReview(false);
      previousExperience.current = experience;
    }
  }, [experience]);
  useEffect(() => {
    if (interactive && !preview && (welcomed || !settings.welcome)) {
      scrollTop.current
        ?.querySelector<HTMLElement>(
          ".customer-question input, .customer-question textarea, .customer-question select",
        )
        ?.focus({ preventScroll: true });
    }
  }, [currentPage.id, welcomed, interactive, preview]);
  function validateStep() {
    if (interactive) {
      validateAnswers(
        draft,
        answers,
        undefined,
        pageQuestions.map((q) => q.id),
      );
    } else
      validateAnswers(
        draft,
        answers,
        experience === "classic" ? undefined : currentPage.id,
      );
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    try {
      validateStep();
      if (!lastPage) {
        if (step === 0 && draft.type === "product") {
          if (!selections.length)
            throw new Error("Choose at least one product.");
          calculateItems(draft, selections);
        }
        setPageIndex(step + 1);
        scrollTop.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }
      validateAnswers(draft, answers);
      if (draft.type === "product") {
        if (!selections.length) throw new Error("Choose at least one product.");
        calculateItems(draft, selections);
      }
      if (preview) {
        setPreviewReview(true);
        return;
      }
      setBusy(true);
      const r = await api(`public/${slug}/submit`, "POST", {
        ...meta.current,
        version,
        website,
        answers,
        selections,
      });
      setReceipt(r);
      // Persist synchronously before leaving; returning from WhatsApp must not resubmit.
      try {
        sessionStorage.setItem(
          key,
          JSON.stringify({
            answers,
            selections,
            pageIndex,
            meta: meta.current,
            receipt: r,
          }),
        );
      } catch {}
      if (
        !embedded &&
        r.completion?.autoOpenWhatsApp !== false &&
        `https://wa.me/${r.phone.replace(/\D/g, "")}?text=${encodeURIComponent(r.message)}`
          .length <= 1800
      ) {
        setOpened(true);
        void fetch(`/api/public/${slug}/handoff`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: r.id, token: r.token }),
          keepalive: true,
        }).catch(() => {});
        window.location.assign(
          `https://wa.me/${r.phone.replace(/\D/g, "")}?text=${encodeURIComponent(r.message)}`,
        );
      }
      scrollTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function handoff() {
    if (!receipt) return;
    setOpened(true);
    api(`public/${slug}/handoff`, "POST", {
      id: receipt.id,
      token: receipt.token,
    }).catch(() =>
      toast.error(
        "Your response is saved, but we could not record the handoff click.",
      ),
    );
  }
  const wa = receipt
    ? `https://wa.me/${receipt.phone.replace(/\D/g, "")}?text=${encodeURIComponent(receipt.message)}`
    : "";
  const long = wa.length > 1800;
  if (receipt)
    return (
      <div className="customer-sheet review" ref={scrollTop}>
        <div className="success-check">
          <Check size={25} />
        </div>
        <span className="eyebrow">
          {receipt.booking ? "APPOINTMENT CONFIRMED" : "REQUEST SAVED"}
        </span>
        <h1>
          {receipt.booking
            ? "Your appointment is booked."
            : receipt.completion?.title || "Your request is saved."}
        </h1>
        {!receipt.booking && receipt.completion?.description && (
          <p>{receipt.completion.description}</p>
        )}
        {receipt.booking && (
          <div className="handoff-notice">
            <div>
              <strong>
                {receipt.booking.serviceName} · {receipt.booking.providerName}
              </strong>
              <p>
                {formatAppointment(
                  receipt.booking.start,
                  receipt.booking.timezone,
                )}
              </p>
              <p>Booking reference: {receipt.booking.id}</p>
              <p>
                Saved in FormChat. WhatsApp delivery is not needed for this
                booking to exist. Open WhatsApp below and tap Send to share the
                summary.
              </p>
            </div>
          </div>
        )}
        <p>
          {embedded
            ? "Your response is saved. Continue to WhatsApp below to contact "
            : receipt.booking || !opened
              ? "Use the button below to contact "
              : "If WhatsApp didn’t open, use the button below to contact "}
          {receipt.businessName}, then tap <strong>Send</strong>.
        </p>
        <div className="handoff-notice">
          <MessageCircle size={19} />
          <span>
            {long
              ? "Your message is long. Copy it, then paste it into WhatsApp."
              : "Your WhatsApp message is ready to review."}
          </span>
        </div>
        {long && (
          <button
            className="btn primary full"
            onClick={() =>
              copy(receipt.message)
                .then(() => toast.success("Message copied"))
                .catch(() => toast.error("Select and copy the message below."))
            }
          >
            <Copy size={16} />
            Copy message
          </button>
        )}
        <a
          className="btn primary full"
          style={{
            background: draft.button,
            color: readableText(draft.button),
            borderColor: draft.button,
          }}
          href={long ? `https://wa.me/${receipt.phone.replace(/\D/g, "")}` : wa}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handoff}
        >
          <MessageCircle size={18} />
          {opened ? "Try WhatsApp again" : "Continue to WhatsApp"}
          <ArrowRight size={17} />
        </a>
        <div className="handoff-actions">
          {!long && (
            <button
              className="text-btn"
              onClick={() =>
                copy(receipt.message)
                  .then(() => toast.success("Message copied"))
                  .catch(() =>
                    toast.error("Select and copy the message below."),
                  )
              }
            >
              <Copy size={14} /> Copy message
            </button>
          )}
          {opened && <small>Remember to tap Send in WhatsApp.</small>}
        </div>
        <hr />
        <h3>Your request</h3>
        <ReceiptView receipt={receipt} />
        <p className="small">
          {receipt.booking
            ? "Contact the business to change or cancel your appointment. Starting prices may vary; no payment has been collected."
            : receipt.items.length
              ? "The business confirms stock, delivery charges and final price in WhatsApp."
              : draft.questions.some((q) => q.type === "date")
                ? "Preferred dates are subject to confirmation by the business."
                : "Your response has been saved."}
        </p>
        <details>
          <summary>View the full message</summary>
          <textarea
            aria-label="WhatsApp message"
            readOnly
            value={receipt.message}
            rows={9}
          />
        </details>
        <small className="reference">
          Reference {receipt.id.slice(0, 8)} · Form submitted, message not
          confirmed sent
        </small>
        <button
          type="button"
          className="text-btn"
          onClick={() => {
            setAnswers({});
            setPageIndex(0);
            setWelcomed(false);
            setSelections([]);
            setReceipt(null);
            setOpened(false);
            setError("");
            meta.current = {
              visitor: meta.current.visitor,
              idempotency: crypto.randomUUID(),
              token: crypto.randomUUID(),
              startedAt: Date.now(),
            };
            started.current = false;
            try {
              sessionStorage.removeItem(key);
            } catch {}
          }}
        >
          Start another request <ArrowRight size={15} />
        </button>
      </div>
    );
  return (
    <div
      className={"customer-sheet " + (interactive ? "interactive-form" : "")}
      ref={scrollTop}
      style={{ borderTopColor: draft.accent }}
    >
      <div className="customer-business">
        {!draft.hideLogo &&
          (business.logo ? (
            <img src={business.logo} alt={`${business.name} logo`} />
          ) : (
            <span
              className="business-monogram"
              style={{
                background: draft.accent,
                color: readableText(draft.accent),
              }}
            >
              {business.name.slice(0, 1)}
            </span>
          ))}
        <span>{business.name || "Your business"}</span>
      </div>
      {!(interactive && settings.welcome && !welcomed) && (
        <>
          <h1>{draft.title}</h1>
          <p className="form-description" dir="auto">
            {draft.description}
          </p>
        </>
      )}
      {interactive && settings.welcome && !welcomed ? (
        <section
          className={
            "interactive-welcome " +
            (settings.media?.src
              ? "has-media media-" + settings.media.layout
              : "")
          }
        >
          {settings.media?.src && <FormImage media={settings.media} />}
          <div className="welcome-copy">
            <span className="welcome-mark">
              <MessageCircle size={32} />
            </span>
            <span className="eyebrow">LET’S MAKE THIS EASY</span>
            <h1>
              {settings.welcomeTitle || draft.title || "Let’s get started"}
            </h1>
            <p>
              {settings.welcomeDescription ||
                draft.description ||
                "Answer a few short questions. You can go back to change an answer before submitting."}
            </p>
            <div className="welcome-facts">
              <span>
                {draft.questions.length}{" "}
                {draft.questions.length === 1 ? "question" : "questions"}
              </span>
              <span>No account needed</span>
            </div>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setWelcomed(true);
                start();
              }}
            >
              {settings.startLabel}
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      ) : previewReview ? (
        <div className="preview-result">
          <CheckCircle2 size={28} />
          <span className="eyebrow">CONFIRMATION PREVIEW</span>
          <h3>{draft.completion?.title || "Your request is saved."}</h3>
          {draft.completion?.description && (
            <p>{draft.completion.description}</p>
          )}
          <p>
            This is a preview. Nothing was saved and no message was sent.
            {draft.completion?.autoOpenWhatsApp === false
              ? " Customers choose Continue to WhatsApp after saving."
              : " A live submission saves the response before opening WhatsApp."}
          </p>
          <button className="btn" onClick={() => setPreviewReview(false)}>
            <ArrowLeft size={15} />
            Back to form
          </button>
        </div>
      ) : (
        <form
          onSubmit={submit}
          onChange={start}
          onKeyDown={(e) => {
            if (interactive && e.key === "Enter") {
              const target = e.target as HTMLElement;
              if (target.tagName === "TEXTAREA" && !(e.ctrlKey || e.metaKey))
                return;
              if (target.tagName === "BUTTON") return;
              e.preventDefault();
              if (settings.keyboard) e.currentTarget.requestSubmit();
            }
          }}
        >
          {((experience === "multipage" && allPages.length > 1) ||
            (interactive && settings.progress)) && (
            <div className="form-stepper" aria-live="polite">
              <div className="between">
                <span className="eyebrow">
                  STEP {step + 1} OF {pages.length}
                </span>
                <span>{Math.round(((step + 1) / pages.length) * 100)}%</span>
              </div>
              <div className="step-track">
                {pages.map((p, i) => (
                  <span key={p.id} className={i <= step ? "complete" : ""} />
                ))}
              </div>
              {!interactive && <h2 tabIndex={-1}>{currentPage.title}</h2>}
              <p>
                {interactive
                  ? "One step closer. Take your time."
                  : "Your answers stay here when you go back."}
              </p>
            </div>
          )}
          {draft.type === "product" && step === 0 && (
            <div className="customer-products">
              <div className="order-section-heading">
                <span className="eyebrow">MAKE IT YOURS</span>
                <h2>Choose your items</h2>
                <p>Add what you like, then choose the details.</p>
              </div>
              {draft.products.some((p) => !p.hidden && p.category) && (
                <label>
                  Category
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">All products</option>
                    {Array.from(
                      new Set(
                        draft.products
                          .filter((p) => !p.hidden)
                          .map((p) => p.category)
                          .filter(Boolean),
                      ),
                    ).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {draft.products.filter((p) => !p.hidden).length > 4 && (
                <input
                  type="search"
                  aria-label="Search products"
                  placeholder="Find a product…"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              )}
              {(productSearch || category) &&
                !draft.products.some(
                  (p) =>
                    !p.hidden &&
                    (!category || p.category === category) &&
                    (p.name + " " + p.description)
                      .toLowerCase()
                      .includes(productSearch.toLowerCase()),
                ) && (
                  <p role="status">
                    No matching products. Try a different search.
                  </p>
                )}

              {draft.products
                .filter(
                  (p) =>
                    !p.hidden &&
                    (!category || p.category === category) &&
                    (p.name + " " + p.description)
                      .toLowerCase()
                      .includes(productSearch.toLowerCase()),
                )
                .map((p) => {
                  const s = selections.find((s) => s.productId === p.id);
                  return (
                    <div
                      className={"customer-product " + (s ? "chosen" : "")}
                      key={p.id}
                    >
                      {p.image && (
                        <img
                          className="product-image"
                          src={p.image}
                          alt={p.name}
                        />
                      )}
                      <div className="between">
                        <h3>{p.name}</h3>
                        <strong>{money(p.price, draft.currency)}</strong>
                      </div>
                      <p>{p.description}</p>
                      <button
                        type="button"
                        className={"btn product-add " + (s ? "selected" : "")}
                        disabled={p.available === false && !s}
                        aria-pressed={!!s}
                        onClick={() =>
                          s
                            ? setSelections(
                                selections.filter((x) => x.productId !== p.id),
                              )
                            : select(p.id, {})
                        }
                      >
                        {s ? <Check size={17} /> : <Plus size={17} />}{" "}
                        {p.available === false
                          ? "Unavailable"
                          : s
                            ? "Remove from order"
                            : "Add to order"}
                        {!s && p.options.length > 0 && (
                          <span>Choose options next</span>
                        )}
                      </button>
                      {s && (
                        <div className="product-customization">
                          <div className="quantity-row">
                            <div>
                              <label htmlFor={`quantity-${p.id}`}>
                                Quantity
                              </label>
                              <small>
                                {p.min > 1 ? `Minimum ${p.min} · ` : ""}Maximum{" "}
                                {p.max}
                              </small>
                            </div>
                            <div className="quantity-control">
                              <button
                                type="button"
                                aria-label={`Decrease quantity of ${p.name}`}
                                disabled={s.quantity <= p.min}
                                onClick={() =>
                                  select(p.id, {
                                    quantity: Math.max(p.min, s.quantity - 1),
                                  })
                                }
                              >
                                <Minus size={16} />
                              </button>
                              <input
                                id={`quantity-${p.id}`}
                                type="number"
                                min={p.min}
                                max={p.max}
                                required
                                value={s.quantity}
                                onChange={(e) =>
                                  select(p.id, {
                                    quantity: Number(e.target.value),
                                  })
                                }
                              />
                              <button
                                type="button"
                                aria-label={`Increase quantity of ${p.name}`}
                                disabled={s.quantity >= p.max}
                                onClick={() =>
                                  select(p.id, {
                                    quantity: Math.min(p.max, s.quantity + 1),
                                  })
                                }
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                          {p.options.map((o) => (
                            <div className="product-option-field" key={o.id}>
                              <label htmlFor={`option-${p.id}-${o.id}`}>
                                {o.name}
                              </label>
                              {o.required && (
                                <span className="required"> *</span>
                              )}
                              {o.type === "choice" && o.values.length <= 5 ? (
                                <span
                                  className="product-option-choices"
                                  role="group"
                                  aria-label={o.name}
                                >
                                  {o.values.map((v) => (
                                    <button
                                      type="button"
                                      key={v.id}
                                      className={
                                        s.options[o.id] === v.id
                                          ? "selected"
                                          : ""
                                      }
                                      aria-pressed={s.options[o.id] === v.id}
                                      onClick={() =>
                                        select(p.id, {
                                          options: {
                                            ...s.options,
                                            [o.id]:
                                              s.options[o.id] === v.id &&
                                              !o.required
                                                ? ""
                                                : v.id,
                                          },
                                        })
                                      }
                                    >
                                      <span>{v.label}</span>
                                      <small>
                                        {v.adjustment
                                          ? `+${money(v.adjustment, draft.currency)}`
                                          : "Included"}
                                      </small>
                                      {s.options[o.id] === v.id && (
                                        <Check size={15} />
                                      )}
                                    </button>
                                  ))}
                                </span>
                              ) : o.type === "choice" ? (
                                <Picker
                                  value={s.options[o.id] || ""}
                                  label={`Choose ${o.name.toLowerCase()}`}
                                  options={o.values.map((v) => ({
                                    value: v.id,
                                    label:
                                      v.label +
                                      (v.adjustment
                                        ? ` (+${money(v.adjustment, draft.currency)})`
                                        : ""),
                                  }))}
                                  onChange={(v) =>
                                    select(p.id, {
                                      options: { ...s.options, [o.id]: v },
                                    })
                                  }
                                />
                              ) : (
                                <input
                                  id={`option-${p.id}-${o.id}`}
                                  aria-label={o.name}
                                  maxLength={500}
                                  required={o.required}
                                  value={s.options[o.id] || ""}
                                  onChange={(e) =>
                                    select(p.id, {
                                      options: {
                                        ...s.options,
                                        [o.id]: e.target.value,
                                      },
                                    })
                                  }
                                />
                              )}
                            </div>
                          ))}
                          {p.allowNote && (
                            <label>
                              Note for this item{" "}
                              <span className="optional">(optional)</span>
                              <textarea
                                maxLength={1000}
                                rows={2}
                                value={s.note || ""}
                                onChange={(e) =>
                                  select(p.id, { note: e.target.value })
                                }
                              />
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
          {draft.type === "product" &&
            (!interactive || step === 0 || lastPage) && (
              <section
                className="order-summary"
                aria-label="Your order summary"
              >
                <div className="between">
                  <h2>Your request</h2>
                  <span>
                    {selections.reduce((n, s) => n + s.quantity, 0)}{" "}
                    {selections.reduce((n, s) => n + s.quantity, 0) === 1
                      ? "item"
                      : "items"}
                  </span>
                </div>
                {!selections.length ? (
                  <p>
                    Your request is empty. Add an item above to get started.
                  </p>
                ) : (
                  estimatedItems.map((item, i) => (
                    <div
                      className="order-summary-line"
                      key={selections[i]?.productId || i}
                    >
                      <div>
                        <strong>
                          {item.quantity} × {item.name}
                        </strong>
                        <small>
                          {item.options
                            .filter((o) => o.value)
                            .map((o) => o.value)
                            .join(" · ")}
                        </small>
                      </div>
                      <div>
                        <strong>{money(item.total, draft.currency)}</strong>
                        <small>
                          {money(item.unitPrice, draft.currency)} each
                        </small>
                        <button
                          type="button"
                          className="text-btn"
                          aria-label={`Remove ${item.name} from request`}
                          onClick={() =>
                            setSelections(
                              selections.filter((_, index) => index !== i),
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <div className="estimated between" aria-live="polite">
                  <strong>Estimated total</strong>
                  <strong>
                    {total === null
                      ? "Check your options"
                      : money(total, draft.currency)}
                  </strong>
                </div>
                <p className="small">
                  Final price, availability and delivery charges are confirmed
                  by the business in WhatsApp.
                </p>
              </section>
            )}
          {draft.type === "product" && !interactive && (
            <div className="order-section-heading">
              <span className="eyebrow">THE FINISHING DETAILS</span>
              <h2>Who is this for?</h2>
              <p>Let the business know how to reach you.</p>
            </div>
          )}
          <div
            className="customer-questions"
            key={interactive ? currentPage.id : "questions"}
          >
            {pageQuestions.map((q) => (
              <div
                className={
                  "customer-question " +
                  (q.media?.src ? "has-media media-" + q.media.layout : "")
                }
                key={q.id}
              >
                {q.media?.src && <FormImage media={q.media} />}
                <div className="question-body">
                  <label htmlFor={"q-" + q.id}>
                    {q.label}
                    {q.required ? (
                      <span className="required"> *</span>
                    ) : (
                      <span className="optional"> (optional)</span>
                    )}
                  </label>
                  {q.description && (
                    <p className="question-help">{q.description}</p>
                  )}
                  {q.type === "dropdown" ? (
                    <select
                      id={"q-" + q.id}
                      required={q.required}
                      value={(answers[q.id] as string) || ""}
                      onChange={(e) =>
                        setAnswers({ ...answers, [q.id]: e.target.value })
                      }
                    >
                      <option value="">
                        {q.placeholder || "Choose an option"}
                      </option>
                      {q.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : ["single choice", "yes/no", "rating"].includes(q.type) ? (
                    <div
                      className={
                        "radio-options " +
                        (q.choiceStyle === "pictures" ||
                        (!q.choiceStyle &&
                          q.options.some((o) => q.optionImages?.[o]))
                          ? "picture-choices "
                          : "") +
                        (q.type === "rating" ? "rating-options" : "")
                      }
                      role="group"
                      aria-label={q.label}
                    >
                      {(q.type === "yes/no"
                        ? ["Yes", "No"]
                        : q.type === "rating"
                          ? Array.from(
                              { length: q.validation?.ratingMax || 5 },
                              (_, i) => String(i + 1),
                            )
                          : q.options
                      ).map((o) => (
                        <label
                          className={
                            "choice " + (answers[q.id] === o ? "selected" : "")
                          }
                          key={o}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={o}
                            required={q.required}
                            checked={answers[q.id] === o}
                            onChange={() => {
                              start();
                              setAnswers({ ...answers, [q.id]: o });
                            }}
                          />
                          {q.choiceStyle !== "text" && q.optionImages?.[o] && (
                            <img
                              style={{ objectFit: q.choiceImageFit || "cover" }}
                              className="answer-choice-image"
                              src={q.optionImages[o]}
                              alt=""
                              loading="lazy"
                            />
                          )}
                          {(q.choiceStyle === "pictures" ||
                            (!q.choiceStyle &&
                              q.options.some(
                                (option) => q.optionImages?.[option],
                              ))) &&
                            !q.optionImages?.[o] && (
                              <span
                                className="answer-choice-placeholder"
                                aria-hidden="true"
                              />
                            )}
                          <span className="answer-choice-label">{o}</span>
                        </label>
                      ))}
                    </div>
                  ) : q.type === "multiple choice" ? (
                    <div
                      className={
                        q.choiceStyle === "pictures" ||
                        (!q.choiceStyle &&
                          q.options.some((o) => q.optionImages?.[o]))
                          ? "picture-choices"
                          : ""
                      }
                      role="group"
                      aria-label={q.label}
                    >
                      {q.options.map((o) => (
                        <label className="check-label choice" key={o}>
                          <Checkbox
                            checked={(answers[q.id] || []).includes(o)}
                            onCheckedChange={(c) => {
                              start();
                              setAnswers({
                                ...answers,
                                [q.id]: c
                                  ? [
                                      ...(Array.isArray(answers[q.id])
                                        ? (answers[q.id] as string[])
                                        : []),
                                      o,
                                    ]
                                  : ((answers[q.id] as string[]) || []).filter(
                                      (v) => v !== o,
                                    ),
                              });
                            }}
                          />
                          {q.choiceStyle !== "text" && q.optionImages?.[o] && (
                            <img
                              style={{ objectFit: q.choiceImageFit || "cover" }}
                              className="answer-choice-image"
                              src={q.optionImages[o]}
                              alt=""
                              loading="lazy"
                            />
                          )}
                          {(q.choiceStyle === "pictures" ||
                            (!q.choiceStyle &&
                              q.options.some(
                                (option) => q.optionImages?.[option],
                              ))) &&
                            !q.optionImages?.[o] && (
                              <span
                                className="answer-choice-placeholder"
                                aria-hidden="true"
                              />
                            )}
                          <span className="answer-choice-label">{o}</span>
                        </label>
                      ))}
                    </div>
                  ) : ["long text", "address"].includes(q.type) ? (
                    <textarea
                      id={"q-" + q.id}
                      placeholder={q.placeholder}
                      minLength={q.validation?.minLength}
                      maxLength={q.validation?.maxLength || 4000}
                      required={q.required}
                      rows={q.type === "address" ? 2 : 3}
                      value={(answers[q.id] as string) || ""}
                      onChange={(e) =>
                        setAnswers({ ...answers, [q.id]: e.target.value })
                      }
                    />
                  ) : (
                    <input
                      id={"q-" + q.id}
                      placeholder={q.placeholder}
                      minLength={q.validation?.minLength}
                      maxLength={q.validation?.maxLength || 4000}
                      min={
                        q.type === "date"
                          ? q.validation?.minDate
                          : q.type === "number"
                            ? q.validation?.min
                            : undefined
                      }
                      max={
                        q.type === "date"
                          ? q.validation?.maxDate
                          : q.type === "number"
                            ? q.validation?.max
                            : undefined
                      }
                      type={
                        q.type === "phone"
                          ? "tel"
                          : q.type === "short text"
                            ? "text"
                            : q.type
                      }
                      step={q.type === "number" ? "any" : undefined}
                      required={q.required}
                      value={(answers[q.id] as string) || ""}
                      onChange={(e) =>
                        setAnswers({ ...answers, [q.id]: e.target.value })
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bot-field" aria-hidden="true">
            <label>
              Website
              <input
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {step > 0 && (
            <button
              type="button"
              className="btn full"
              onClick={() => {
                setPageIndex(step - 1);
                setError("");
                scrollTop.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              <ArrowLeft size={16} />
              Previous step
            </button>
          )}
          <button
            className="btn primary full customer-submit"
            style={{
              background: draft.button,
              borderColor: draft.button,
              color: readableText(draft.button),
            }}
            disabled={busy}
          >
            {busy
              ? "Saving your request…"
              : lastPage
                ? preview
                  ? "Finish preview"
                  : draft.appearance?.buttonText ||
                    (embedded ? "Submit request" : "Submit & open WhatsApp")
                : "Continue"}
            <ArrowRight size={17} />
          </button>
          {interactive && settings.keyboard && (
            <p className="keyboard-hint">
              Press Enter to continue · Ctrl / ⌘ + Enter for long answers
            </p>
          )}
          <p className="customer-note">
            {preview ? (
              "Preview only. Your answers are not saved or shared."
            ) : (
              <>
                {draft.type === "service"
                  ? draft.questions.some((q) => q.type === "date")
                    ? "Preferred dates are subject to confirmation by the business."
                    : "Your answers are saved securely before continuing."
                  : "Your order is a request. Stock and pricing are confirmed by the business."}{" "}
                Your details will be shared with {business.name}.
              </>
            )}
          </p>
        </form>
      )}
      <div className="powered">
        Made with <strong>{PRODUCT_NAME}</strong>
      </div>
    </div>
  );
}
export default function Customer(
  props: React.ComponentProps<typeof CustomerContent>,
) {
  const a = formAppearance(props.draft);
  return (
    <div
      className="customer-theme"
      data-hide-branding={a.hideBranding}
      data-accent-line={a.accentLine}
      style={appearanceVariables(props.draft) as React.CSSProperties}
    >
      <CustomerContent
        {...props}
        business={{ ...props.business, logo: a.logo || props.business.logo }}
      />
    </div>
  );
}
export function PublicForm({ slug }: { slug: string }) {
  const { embedded, inline } = usePublicEmbed("form", slug);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api(`public/${slug}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [slug]);
  return (
    <main
      className={
        "public-page" +
        (embedded ? " embedded-form-page" : "") +
        (inline ? " inline-form-page" : "")
      }
      style={{
        background: data ? formAppearance(data.form).background : "#ffffff",
      }}
    >
      {error ? (
        <div className="customer-sheet">
          <h1>We couldn’t open this form.</h1>
          <p>{error}</p>
          <button className="btn" onClick={() => location.reload()}>
            <RefreshCw size={15} />
            Try again
          </button>
        </div>
      ) : data ? (
        <Customer
          draft={data.form}
          business={data.business}
          slug={slug}
          version={data.version}
          embedded={embedded}
        />
      ) : (
        <div className="loading" role="status">
          Opening form…
        </div>
      )}
      <Toaster richColors />
    </main>
  );
}
