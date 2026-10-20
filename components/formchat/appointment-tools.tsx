"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { formatAppointment } from "@/lib/appointments";
import { money } from "@/lib/model";
const empty = { name: "", email: "", phone: "", notes: "", archived: false };
export function Customers({
  id,
  onBook,
}: {
  id?: string;
  onBook: (customer: any) => void;
}) {
  const [rows, setRows] = useState<any[]>([]),
    [profile, setProfile] = useState<any>(null),
    [draft, setDraft] = useState<any>(null),
    [search, setSearch] = useState(""),
    [archived, setArchived] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0),
    [truncated, setTruncated] = useState(false);
  useEffect(() => {
    let active = true;
    setProfile(null);
    setDraft(null);
    setError("");
    api(
      id
        ? `appointments/customers/${id}`
        : `appointments/customers?${new URLSearchParams({ search, archived: String(archived) })}`,
    )
      .then((r) => {
        if (!active) return;
        if (id) {
          setProfile(r);
          setDraft({ ...r.customer, archived: !!r.customer.archived });
        } else {
          setRows(r.customers);
          setTruncated(r.truncated);
        }
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [id, search, archived, version]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const input = {
        name: draft.name,
        email: draft.email,
        phone: draft.phone,
        notes: draft.notes,
        archived: draft.archived,
        ...(id ? { revision: draft.revision } : {}),
      };
      const r = await api(
        `appointments/customers${id ? `/${id}` : ""}`,
        id ? "PATCH" : "POST",
        input,
      );
      if (!id) window.location.hash = `appointments/customers/${r.id}`;
      else setVersion((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="booking-customer-section">
      <header className="booking-section-toolbar">
        <div>
          <h2>{id ? profile?.customer.name || "Customer" : "Customers"}</h2>
          <p>Contact details, private notes and appointment history.</p>
        </div>
        {id ? (
          <>
            <a className="btn" href="#appointments/customers">
              All customers
            </a>
            <button
              className="btn primary"
              disabled={!profile || !!profile.customer.archived}
              onClick={() => onBook(profile.customer)}
            >
              Add booking
            </button>
          </>
        ) : (
          <button
            className="btn primary"
            onClick={() => setDraft({ ...empty })}
          >
            Add customer
          </button>
        )}
      </header>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!id && (
        <>
          <div className="booking-list-filters">
            <label>
              Search customers
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, email or phone"
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={archived}
                onChange={(e) => setArchived(e.target.checked)}
              />{" "}
              Archived customers
            </label>
          </div>
          {truncated && <p>Showing 500 customers. Narrow your search.</p>}
          <div className="customer-grid">
            {rows.map((c) => (
              <a
                className="customer-card"
                href={`#appointments/customers/${c.id}`}
                key={c.id}
              >
                <span className="customer-avatar">{c.name.slice(0, 1)}</span>
                <h3>{c.name}</h3>
                <p>{c.email}</p>
                <p>{c.phone}</p>
                <small>{c.booking_count} appointments · View profile →</small>
              </a>
            ))}
          </div>
          {!rows.length && (
            <p className="book-empty">
              No matching customers. Customers also appear here when they book.
            </p>
          )}
        </>
      )}
      {draft && (
        <form className="panel customer-edit" onSubmit={save}>
          <h3>{id ? "Customer details" : "New customer"}</h3>
          <div className="customer-fields">
            {["name", "email", "phone"].map((key) => (
              <label key={key}>
                {key === "phone" ? "Phone with country code" : key}
                <input
                  required
                  type={key === "email" ? "email" : "text"}
                  maxLength={key === "name" ? 120 : 254}
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
          <label>
            Private notes
            <textarea
              maxLength={5000}
              rows={4}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </label>
          <p className="small">
            Notes are visible to the owner only. Editing contact details does
            not rewrite past booking records.
          </p>
          {id && (
            <label>
              <input
                type="checkbox"
                checked={draft.archived}
                onChange={(e) =>
                  setDraft({ ...draft, archived: e.target.checked })
                }
              />{" "}
              Archive customer (existing bookings remain active)
            </label>
          )}
          <div className="appointment-actions">
            <button className="btn primary" disabled={busy}>
              {busy ? "Saving…" : "Save customer"}
            </button>
            {!id && (
              <button
                className="btn"
                type="button"
                onClick={() => setDraft(null)}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
      {profile && (
        <section>
          <h3>Appointment history</h3>
          <div className="booking-list">
            {profile.bookings.map((b: any) => (
              <a
                className="customer-history-row"
                href={`#appointments/booking/${b.id}`}
                key={b.id}
              >
                <span>
                  <strong>{b.details.serviceName}</strong>
                  <small>{formatAppointment(b.start, b.timezone)}</small>
                </span>
                <span className={`booking-status ${b.status}`}>
                  {b.status.replace("_", " ")}
                </span>
              </a>
            ))}
            {!profile.bookings.length && <p>No appointments yet.</p>}
          </div>
        </section>
      )}
    </section>
  );
}
export function ManualBooking({
  settings,
  customer,
  onDone,
  onClose,
}: {
  settings: any;
  customer?: any;
  onDone: (id: string) => void;
  onClose: () => void;
}) {
  const [service, setService] = useState(""),
    [provider, setProvider] = useState(""),
    [date, setDate] = useState(""),
    [start, setStart] = useState(""),
    [slots, setSlots] = useState<any[]>([]),
    [contact, setContact] = useState({ ...empty, ...customer, notes: "" }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef<any>(null);
  const selected = settings.config.services.find((s: any) => s.id === service);
  useEffect(() => {
    let active = true;
    setSlots([]);
    setStart("");
    if (service && provider && date)
      api(
        `appointments/slots?${new URLSearchParams({ service, provider, date })}`,
      )
        .then((r) => active && setSlots(r.slots))
        .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [service, provider, date]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const input = pending.current || {
      appointment: { serviceId: service, providerId: provider, start },
      customer: {
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        notes: contact.notes,
      },
      idempotency: crypto.randomUUID(),
      token: crypto.randomUUID(),
      startedAt: Date.now() - 5000,
      website: "",
    };
    pending.current = input;
    try {
      const response = await fetch("/api/appointments/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const r: any = await response.json();
      if (!response.ok) {
        if (response.status < 500) pending.current = null;
        throw new Error(r.error || "Unable to save booking.");
      }
      onDone(r.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel customer-edit" onSubmit={submit}>
      <header className="booking-section-toolbar">
        <div>
          <h2>New appointment</h2>
          <p>
            Owner-created appointments are confirmed when saved. Times are in{" "}
            {settings.config.timezone}.
          </p>
        </div>
        <button type="button" className="btn" disabled={busy} onClick={onClose}>
          Close
        </button>
      </header>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <fieldset
        disabled={busy || !!pending.current}
        className="customer-fields"
      >
        <label>
          Service
          <select
            required
            value={service}
            onChange={(e) => {
              setService(e.target.value);
              setProvider("");
            }}
          >
            <option value="">Choose service</option>
            {settings.config.services
              .filter((s: any) => s.active !== false)
              .map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Team member
          <select
            required
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="">Choose team member</option>
            {settings.team
              .filter((p: any) => selected?.providerIds.includes(p.id))
              .map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Date
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Available time
          <select
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
          >
            <option value="">Choose time</option>
            {slots.map((s) => (
              <option key={s.start} value={s.start}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {["name", "email", "phone"].map((k) => (
          <label key={k}>
            {k}
            <input
              required
              type={k === "email" ? "email" : "text"}
              value={(contact as any)[k]}
              onChange={(e) => setContact({ ...contact, [k]: e.target.value })}
            />
          </label>
        ))}
        <label>
          Customer notes
          <textarea
            value={contact.notes}
            maxLength={2000}
            onChange={(e) => setContact({ ...contact, notes: e.target.value })}
          />
        </label>
      </fieldset>
      <button
        className="btn primary"
        disabled={busy || (!start && !pending.current)}
      >
        {busy
          ? "Saving…"
          : pending.current
            ? "Retry original booking"
            : "Create appointment"}
      </button>
      <p className="small">
        No payment or notification is sent. A network retry uses the same
        request.
      </p>
    </form>
  );
}
export function BookingDetail({
  id,
  onReschedule,
}: {
  id: string;
  onReschedule: (booking: any) => void;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    api(`appointments/bookings/${id}`)
      .then((r) => active && setData(r))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [id, refresh]);
  async function change(status: string) {
    if (
      ["declined", "cancelled"].includes(status) &&
      !window.confirm("Close this appointment and release its time?")
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api(`appointments/bookings/${id}`, "PATCH", {
        revision: data.booking.revision,
        status,
      });
      setRefresh((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!data) return <p role="status">{error || "Loading booking…"}</p>;
  const b = data.booking;
  return (
    <section>
      <a className="text-btn" href="#appointments/bookings">
        ← All bookings
      </a>
      <header className="booking-section-toolbar">
        <div>
          <h2>{b.details.serviceName}</h2>
          <p>{b.details.customer}</p>
        </div>
        <span className={`booking-status ${b.status}`}>
          {b.status.replace("_", " ")}
        </span>
      </header>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="booking-detail-grid">
        <section className="panel customer-edit">
          <h3>Appointment details</h3>
          <p>{formatAppointment(b.start, b.timezone)}</p>
          <p>With {b.details.providerName}</p>
          <p>Starting price {money(b.details.price, b.details.currency)}</p>
          <small>Reference: {b.id}</small>
          <div className="appointment-actions">
            {(b.status === "pending"
              ? ["confirmed", "declined"]
              : b.status === "confirmed"
                ? ["completed", "no_show", "cancelled"]
                : []
            ).map((status) => (
              <button
                className={status === "confirmed" ? "btn primary" : "btn"}
                disabled={busy}
                key={status}
                onClick={() => void change(status)}
              >
                {status === "confirmed"
                  ? "Accept"
                  : status === "declined"
                    ? "Decline"
                    : status === "cancelled"
                      ? "Cancel"
                      : status === "completed"
                        ? "Mark completed"
                        : "Mark no-show"}
              </button>
            ))}
            {["pending", "confirmed"].includes(b.status) && (
              <button className="btn" onClick={() => onReschedule(b)}>
                Reschedule
              </button>
            )}
          </div>
          <p className="small">
            Tell the customer about changes; notifications are not sent
            automatically.
          </p>
        </section>
        <section className="panel customer-edit">
          <h3>Customer</h3>
          <p>{b.details.customer}</p>
          <p>{b.details.email}</p>
          <p>{b.details.customerPhone}</p>
          {b.details.notes && <p>{b.details.notes}</p>}
          {b.customer_id && (
            <a
              className="btn"
              href={`#appointments/customers/${b.customer_id}`}
            >
              View customer profile
            </a>
          )}
        </section>
      </div>
      <section className="panel customer-edit">
        <h3>Activity</h3>
        {data.activity.length ? (
          data.activity.map((a: any, i: number) => (
            <div className="booking-activity" key={i}>
              <strong>{a.action.replace("_", " ")}</strong>
              <span>{formatAppointment(a.created_at, b.timezone)}</span>
              <small>
                Appointment: {formatAppointment(a.start, b.timezone)}
              </small>
            </div>
          ))
        ) : (
          <p>
            Created {formatAppointment(b.created_at, b.timezone)}. Detailed
            activity is recorded for changes made after this update.
          </p>
        )}
      </section>
    </section>
  );
}
