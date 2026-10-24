"use client";
import { formatAppointment } from "@/lib/appointments";
import type { InboxResponse } from "@/lib/response-pagination";
import ResponseAnswers from "./response-answers";
import { useEffect, useState } from "react";
import {
  Inbox,
  Search,
  ArrowUpRight,
  Trash2,
  ChevronRight,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Business, FormRecord, TeamMember, money } from "@/lib/model";
import { PLANS } from "@/lib/config";
import { api } from "@/lib/client";
import { Picker, Confirm, Loading } from "./ui";
export default function ResponsesPage({
  forms,
  business,
  fixedFormId,
}: {
  forms: FormRecord[];
  business: Business;
  fixedFormId?: string;
}) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [assigned, setAssigned] = useState("all");
  useEffect(() => {
    if (business.role !== "member")
      api("team")
        .then((r) => setMembers(r.members))
        .catch(() => {});
  }, [business.role]);
  const [rows, setRows] = useState<InboxResponse[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pages, setPages] = useState<(string | null)[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workflow, setWorkflow] = useState("all");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [handoff, setHandoff] = useState("all");
  const [detail, setDetail] = useState<InboxResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reload, setReload] = useState(0);
  const params = new URLSearchParams({
    search,
    ...(workflow !== "all" ? { status: workflow } : {}),
    ...(assigned !== "all" ? { assigned } : {}),
    ...(fixedFormId ? { form: fixedFormId } : form !== "all" ? { form } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(handoff !== "all" ? { handoff } : {}),
  }).toString();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize browser/API lifecycle state and clear stale data before loading the new resource.
    setCursor(null);
    setPages([]);
  }, [params]);
  useEffect(() => {
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize browser/API lifecycle state and clear stale data before loading the new resource.
    setLoading(true);
    const timer = setTimeout(
      () =>
        api(
          "responses?" +
            params +
            (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
        )
          .then((r) => {
            if (live) {
              setRows(r.responses);
              setNextCursor(r.nextCursor);
              setTotal(r.total);
              setError("");
            }
          })
          .catch((e) => live && setError(e.message))
          .finally(() => live && setLoading(false)),
      250,
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [params, reload, cursor]);
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">EVERY REQUEST, IN ONE PLACE</span>
          <h1>Responses</h1>
          <p>The details are here. The conversation continues on WhatsApp.</p>
        </div>
        <a
          className="btn"
          aria-disabled={!PLANS[business.plan].csv}
          href={
            PLANS[business.plan].csv
              ? "/api/responses/export?" + params
              : undefined
          }
          download
          title={
            !PLANS[business.plan].csv
              ? "CSV export is included in Business"
              : undefined
          }
        >
          <Download size={16} />
          Export CSV
          {!PLANS[business.plan].csv && (
            <span className="mini-plan">BUSINESS</span>
          )}
        </a>
      </div>
      <div className="inbox-summary">
        <div>
          <span className="eyebrow">
            {business.role === "member"
              ? "YOUR ASSIGNED REQUESTS"
              : "YOUR RESPONSE INBOX"}
          </span>
          <strong>{loading ? "…" : rows.length} requests</strong>
          <p>
            Open a response to see every answer, order detail and its assigned
            teammate.
          </p>
        </div>
        <Inbox size={36} />
      </div>
      <div className="workflow-tabs" aria-label="Response status filters">
        {["all", "new", "contacted", "completed"].map((status) => (
          <button
            className={"btn" + (workflow === status ? " primary" : "")}
            key={status}
            aria-pressed={workflow === status}
            onClick={() => setWorkflow(status)}
          >
            {status === "all"
              ? "All requests"
              : status[0].toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>
      <div className="response-filters">
        <div className="search-box">
          <Search size={16} />
          <input
            aria-label="Search responses"
            placeholder="Search name or answers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {business.role !== "member" && (
          <Picker
            label="Filter assignee"
            value={assigned}
            onChange={setAssigned}
            options={[
              { value: "all", label: "Everyone" },
              { value: "owner", label: "Business owner" },
              ...members.map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
        )}
        {!fixedFormId && (
          <Picker
            value={form}
            onChange={setForm}
            label="Filter by form"
            options={[
              { value: "all", label: "All forms" },
              ...forms.map((f) => ({ value: f.id, label: f.draft.title })),
            ]}
          />
        )}
        <Picker
          value={handoff}
          onChange={setHandoff}
          label="Filter handoff"
          options={[
            { value: "all", label: "All handoffs" },
            { value: "yes", label: "Handoff clicked" },
            { value: "no", label: "Not clicked" },
          ]}
        />
        <label>
          From
          <input
            aria-label="From date"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          To
          <input
            aria-label="To date"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
          <button className="text-btn" onClick={() => setReload((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}
      <div className="forms-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer / request</TableHead>
              <TableHead>Form</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Estimated value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned to</TableHead>
              <TableHead>WhatsApp handoff</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <button
                    className="response-name"
                    onClick={() => {
                      setDetail(r);
                      setNotes(r.internal_notes || "");
                    }}
                  >
                    <strong>{r.customer}</strong>
                    <small>{r.summary || "View complete response"}</small>
                  </button>
                </TableCell>
                <TableCell>
                  {r.receipt.formTitle}
                  <small className="date-sub">
                    {r.receipt.formType === "product"
                      ? "Product order"
                      : "Service enquiry"}
                    {r.form_deleted ? " · Deleted form" : ""}
                  </small>
                </TableCell>
                <TableCell className="date-cell">
                  {new Date(r.created_at).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                  })}
                  <small className="date-sub">
                    {new Date(r.created_at).toLocaleTimeString("en", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </small>
                </TableCell>
                <TableCell>
                  {r.receipt.items.length
                    ? money(r.total, r.receipt.currency)
                    : "—"}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      "workflow-status " + (r.workflow_status || "new")
                    }
                  >
                    {r.workflow_status || "new"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="assignee-pill">
                    {r.assigned_name || "Owner"}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={
                      "handoff-badge " + (r.handoff_at ? "clicked" : "")
                    }
                  >
                    {r.handoff_at ? (
                      <>
                        <ArrowUpRight size={13} />
                        Clicked
                      </>
                    ) : (
                      <>Not clicked</>
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  <button
                    className="icon-btn"
                    onClick={() => {
                      setDetail(r);
                      setNotes(r.internal_notes || "");
                    }}
                    aria-label={`Open response from ${r.customer}`}
                  >
                    <ChevronRight size={18} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <nav className="response-pagination" aria-label="Response pages">
          <button
            className="btn"
            disabled={loading || !pages.length}
            onClick={() => {
              setCursor(pages[pages.length - 1]);
              setPages(pages.slice(0, -1));
            }}
          >
            Previous
          </button>
          <span>
            Page {pages.length + 1} · {total} requests
          </span>
          <button
            className="btn"
            disabled={loading || !nextCursor}
            onClick={() => {
              setPages([...pages, cursor]);
              setCursor(nextCursor);
            }}
          >
            Next
          </button>
        </nav>
        {loading ? (
          <Loading />
        ) : (
          !rows.length && (
            <div className="empty-state">
              <Inbox size={29} />
              <h3>No responses here yet</h3>
              <p>Share a published form, or adjust your filters.</p>
            </div>
          )
        )}
        <div className="table-footer">
          {rows.length} responses
          <span>A handoff click does not confirm a sent message.</span>
        </div>
      </div>
      <Sheet open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <SheetContent className="response-sheet">
          <SheetHeader>
            <SheetTitle>Response details</SheetTitle>
            <SheetDescription>
              {detail?.receipt.formTitle} ·{" "}
              {detail && new Date(detail.created_at).toLocaleString()}
            </SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="response-detail">
              <section className="response-workflow">
                <h3>Manage this request</h3>
                <label>
                  Status
                  <select
                    disabled={business.role === "member" || saving}
                    value={detail.workflow_status || "new"}
                    onChange={async (e) => {
                      const status = e.target.value;
                      setSaving(true);
                      try {
                        await api(`responses/${detail.id}`, "PATCH", {
                          status,
                        });
                        setDetail({ ...detail, workflow_status: status });
                        setReload((n) => n + 1);
                        toast.success("Status updated");
                      } catch (e) {
                        toast.error((e as Error).message);
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
                <label>
                  Internal notes
                  <textarea
                    rows={4}
                    maxLength={10000}
                    readOnly={business.role === "member"}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add context, follow-up details or agreed next steps…"
                  />
                </label>
                <p className="small">
                  Private to your workspace. Never included in the customer’s
                  WhatsApp message.
                </p>
                {business.role !== "member" && (
                  <button
                    className="btn"
                    disabled={saving || notes === (detail.internal_notes || "")}
                    onClick={async () => {
                      setSaving(true);
                      try {
                        await api(`responses/${detail.id}`, "PATCH", { notes });
                        setDetail({ ...detail, internal_notes: notes });
                        setReload((n) => n + 1);
                        toast.success("Notes saved");
                      } catch (e) {
                        toast.error((e as Error).message);
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    {saving ? "Saving…" : "Save notes"}
                  </button>
                )}
              </section>
              {detail.booking_id && (
                <section className="panel appointment-card">
                  <h3>Linked appointment</h3>
                  <p>
                    {detail.receipt.booking?.serviceName} ·{" "}
                    {detail.booking_status}
                  </p>
                  <p>
                    {formatAppointment(
                      detail.booking_start!,
                      detail.booking_timezone!,
                    )}
                  </p>
                  <small>Booking reference: {detail.booking_id}</small>
                  <p>Manage this booking from Appointments.</p>
                </section>
              )}
              <ResponseAnswers response={detail} />
              <div className="response-assignment">
                <h3>Assigned teammate</h3>
                {business.role !== "member" ? (
                  <label>
                    Inbox owner
                    <select
                      value={detail.assigned_to || "owner"}
                      onChange={async (e) => {
                        const assignedTo =
                          e.target.value === "owner" ? null : e.target.value;
                        try {
                          await api(`responses/${detail.id}`, "PATCH", {
                            assignedTo,
                          });
                          setDetail({
                            ...detail,
                            assigned_to: assignedTo,
                            assigned_name:
                              members.find((m) => m.id === assignedTo)?.name ||
                              null,
                          });
                          setReload((n) => n + 1);
                          toast.success("Assignment updated");
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      <option value="owner">Business owner</option>
                      {detail.assigned_to &&
                        !members.some(
                          (m) =>
                            m.id === detail.assigned_to &&
                            m.status === "active",
                        ) && (
                          <option value={detail.assigned_to} disabled>
                            {detail.assigned_name || "Removed member"} ·
                            inactive
                          </option>
                        )}
                      {members
                        .filter((m) => m.status === "active")
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                  </label>
                ) : (
                  <p>{detail.assigned_name || "You"}</p>
                )}
                <p className="small">
                  Original WhatsApp destination: {detail.receipt.phone}. Inbox
                  reassignment does not change the customer’s saved link.
                </p>
              </div>
              <details>
                <summary>WhatsApp draft</summary>
                <pre dir="auto">{detail.receipt.message}</pre>
              </details>
              <p className="small">
                Published version {detail.version}. Answers and prices are saved
                as submitted.
              </p>
              {business.role !== "member" && (
                <button
                  className="text-btn danger"
                  onClick={() => setDeleting(true)}
                >
                  <Trash2 size={15} />
                  Delete this response
                </button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Confirm
        title="Permanently delete this response?"
        description="The answers, saved snapshot and customer details will be removed. This cannot be undone."
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          try {
            if (!detail) return;
            await api("responses/" + detail.id, "DELETE");
            setDeleting(false);
            setDetail(null);
            setReload((n) => n + 1);
            toast.success("Response deleted");
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
    </>
  );
}
