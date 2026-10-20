"use client";
import { Copy, FileText, Package, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { copy } from "@/lib/client";
import { Receipt, money } from "@/lib/model";
export default function ResponseAnswers({ response: r }: { response: any }) {
  const receipt: Receipt = r.receipt;
  const groups = [
    ...new Set(receipt.answers.map((a) => a.page || "Customer details")),
  ];
  return (
    <>
      <div className="response-overview">
        <span className="response-avatar">
          {r.customer.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <span className="eyebrow">
            {receipt.formType === "product"
              ? "PRODUCT ORDER"
              : "SERVICE ENQUIRY"}
          </span>
          <h2>{r.customer}</h2>
          <p>{receipt.formTitle}</p>
        </div>
      </div>
      <div className="response-facts">
        <div>
          <span>Reference</span>
          <strong>#{r.id.slice(0, 8)}</strong>
        </div>
        <div>
          <span>Received</span>
          <strong>
            {new Date(r.created_at).toLocaleDateString("en", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </strong>
          <small>
            {new Date(r.created_at).toLocaleTimeString("en", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </small>
        </div>
        <div>
          <span>Answers</span>
          <strong>
            {receipt.answers.filter((a) => a.value.length).length} completed
          </strong>
        </div>
      </div>
      <div className="response-status">
        <CheckCircle2 size={18} />
        <div>
          <strong>Request safely received</strong>
          <small>
            {r.handoff_at
              ? `WhatsApp link opened ${new Date(r.handoff_at).toLocaleString()}`
              : "Customer hasn’t opened the WhatsApp link yet."}
          </small>
        </div>
      </div>
      <div className="between answer-heading">
        <h3>
          <FileText size={18} /> Submitted answers
        </h3>
        <button
          className="text-btn"
          onClick={() =>
            copy(
              receipt.answers
                .map(
                  (a) =>
                    `${a.label}: ${Array.isArray(a.value) ? a.value.join(", ") : a.value || "Not provided"}`,
                )
                .join("\n"),
            )
              .then(() => toast.success("Answers copied"))
              .catch(() => toast.error("Could not copy answers."))
          }
        >
          <Copy size={14} />
          Copy
        </button>
      </div>
      {groups.map((group) => (
        <section className="answer-group" key={group}>
          {groups.length > 1 && <h4>{group}</h4>}
          <dl>
            {receipt.answers
              .filter((a) => (a.page || "Customer details") === group)
              .map((a, i) => (
                <div
                  className={
                    "answer-card " + (!a.value.length ? "unanswered" : "")
                  }
                  key={a.id || i}
                >
                  <dt>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {a.label}
                  </dt>
                  <dd dir="auto">
                    {Array.isArray(a.value) ? (
                      a.value.length ? (
                        <div className="answer-tags">
                          {a.value.map((v) => (
                            <span key={v}>{v}</span>
                          ))}
                        </div>
                      ) : (
                        "Not provided"
                      )
                    ) : (
                      a.value || "Not provided"
                    )}
                  </dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
      {!!receipt.items.length && (
        <section className="response-order">
          <h3>
            <Package size={18} />
            Order details{" "}
            <span>
              {receipt.items.reduce((n, i) => n + i.quantity, 0)} items
            </span>
          </h3>
          {receipt.items.map((item, i) => (
            <article key={i}>
              <div className="between">
                <div>
                  <span className="item-quantity">{item.quantity}×</span>
                  <strong>{item.name}</strong>
                </div>
                <strong>{money(item.total, receipt.currency)}</strong>
              </div>
              <small>{money(item.unitPrice, receipt.currency)} per item</small>
              <dl>
                {item.options
                  .filter((o) => o.value)
                  .map((o, j) => (
                    <div key={j}>
                      <dt>{o.name}</dt>
                      <dd>
                        {o.value}
                        {o.adjustment
                          ? ` (+${money(o.adjustment, receipt.currency)} each)`
                          : ""}
                      </dd>
                    </div>
                  ))}
              </dl>
              {item.note && (
                <p className="item-note" dir="auto">
                  {item.note}
                </p>
              )}
            </article>
          ))}
          <div className="response-total">
            <span>Estimated total</span>
            <strong>{money(receipt.total, receipt.currency)}</strong>
          </div>
          <p className="small">
            Availability, delivery and the final price are confirmed by the
            business.
          </p>
        </section>
      )}
    </>
  );
}
